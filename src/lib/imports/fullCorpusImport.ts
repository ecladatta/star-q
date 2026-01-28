'use server'
import type { DocumentData, ExportModel } from '@/types/types'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, corpusCustomEntity, document } from '@/db/schema'

/**
 * Import documents and annotations from a full corpus export
 */
export async function importFullCorpusExportDocuments(
  corpusId: string,
  corpusData: ExportModel,
): Promise<{ ids: string[], errors: string[] }> {
  const importedDocumentsIds: string[] = []
  const errors: string[] = []

  await db.transaction(async (tx) => {
    // Map old custom entity IDs to new database IDs
    const customEntityIdMap: Record<string, string> = {}

    // Batch insert custom entities
    if (corpusData.customEntities && corpusData.customEntities.length > 0) {
      const entitiesToInsert = corpusData.customEntities.map((ent) => {
        const { id: oldId, ...data } = ent
        return {
          ...data,
          corpusId,
          createdAt: data.createdAt ? new Date(data.createdAt) : null,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
          _oldId: oldId,
        }
      })

      const insertedEntities = await tx.insert(corpusCustomEntity)
        .values(entitiesToInsert.map(({ _oldId, ...data }) => data))
        .returning({ id: corpusCustomEntity.id })

      // Map old IDs to new IDs
      entitiesToInsert.forEach((ent, idx) => {
        customEntityIdMap[ent._oldId] = insertedEntities[idx].id
      })
    }

    for (let i = 0; i < corpusData.documents.length; i++) {
      const doc = corpusData.documents[i]
      try {
        // Insert document with content
        const baseCreatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date()

        const [documentId] = await tx.insert(document).values({
          corpusId,
          title: doc.title,
          raw: doc.raw as DocumentData,
          createdAt: baseCreatedAt,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          completedAt: doc.completedAt ? new Date(doc.completedAt) : null,
          order: i + 1,
        }).returning({ id: document.id })

        // Insert annotations for this document
        if (doc.annotations && doc.annotations.length > 0) {
          for (const ann of doc.annotations) {
            try {
              // Insert annotation components (subject, predicate, object)
              const components = await Promise.all(['subject', 'predicate', 'object'].map(async (key) => {
                const comp = ann[key as keyof typeof ann]
                if (typeof comp === 'object' && comp !== null) {
                  const { id: _id, ...data } = comp
                  // If entityCustomId exists, replace with new ID from mapping
                  if (data.entityCustomId && customEntityIdMap[data.entityCustomId]) {
                    data.entityCustomId = customEntityIdMap[data.entityCustomId]
                    // For custom entities, clear the entity fields as they should be fetched from corpusCustomEntity
                    data.entityLabel = null
                    data.entityValue = null
                    data.entityDatatype = null
                  }
                  const [insertedComp] = await tx.insert(annotationComponent).values(data).returning({ id: annotationComponent.id })
                  return insertedComp
                } else {
                  errors.push(`Annotation component '${key}' is not an object: ${JSON.stringify(comp)} in document ${doc.title}`)
                  return null
                }
              }))
              if (components.includes(null)) {
                errors.push(`Skipping annotation in document ${doc.title} due to invalid component.`)
                continue
              }
              const [subjectComp, predicateComp, objectComp] = components as [ { id: string }, { id: string }, { id: string } ]

              // Insert annotation record
              const { id: _annotationId, ...annotationData } = ann
              await tx.insert(annotation).values({
                documentId: documentId.id,
                subjectId: subjectComp.id,
                predicateId: predicateComp.id,
                objectId: objectComp.id,
                ...annotationData,
              })
            } catch (annErr) {
              errors.push(`Error inserting annotation in document ${doc.title}: ${annErr}`)
              continue
            }
          }
        }

        importedDocumentsIds.push(documentId.id)
      } catch (docErr) {
        errors.push(`Error inserting document ${doc.title}: ${docErr}`)
        continue
      }
    }
  })

  if (errors.length > 0) {
    console.warn('Import errors:', errors)
  }

  return { ids: importedDocumentsIds, errors }
}
