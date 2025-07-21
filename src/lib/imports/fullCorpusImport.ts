'use server'
import type { DocumentData, ExportModel } from '@/types/types'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, document } from '@/db/schema'

/**
 * Import documents and annotations from a full corpus export
 */
export async function importFullCorpusExportDocuments(corpusId: string, corpusData: ExportModel): Promise<string[]> {
  const importedDocumentsIds: string[] = []
  for (const doc of corpusData.documents) {
    // Insert document with content
    const [documentId] = await db.insert(document).values({
      corpusId,
      title: doc.title,
      raw: doc.content as DocumentData,
    }).returning({ id: document.id })

    // Insert annotations for this document
    if (doc.annotations && doc.annotations.length > 0) {
      for (const ann of doc.annotations) {
        // Insert annotation components (subject, predicate, object)
        const components = ['subject', 'predicate', 'object'].map((key) => {
          const comp = ann[key as keyof typeof ann]
          if (typeof comp === 'object' && comp !== null) {
            const { id: _id, ...data } = comp
            return db.insert(annotationComponent).values(data).returning({ id: annotationComponent.id })
          } else {
            throw new Error(`Annotation component '${key}' is not an object: ${JSON.stringify(comp)}`)
          }
        })
        const [[subjectComp], [predicateComp], [objectComp]] = await Promise.all(components)

        // Insert annotation record
        const { id: _annotationId, ...annotationData } = ann
        await db.insert(annotation).values({
          documentId: documentId.id,
          subjectId: subjectComp.id,
          predicateId: predicateComp.id,
          objectId: objectComp.id,
          ...annotationData,
        })
      }
    }

    importedDocumentsIds.push(documentId.id)
  }
  return importedDocumentsIds
}
