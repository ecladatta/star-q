'use server'
import type { DocumentAnnotation, DocumentData, Entity } from '@/app/corpus/[corpusId]/corpus-view'
import type { AnnotationComponent, Document } from '@/db/schema'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, corpus, document } from '@/db/schema'
import { determineImportType, InvalidJsonLinesError, UnsupportedFileTypeError } from '@/lib/utils'
import { count, desc, eq, getTableColumns } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { revalidatePath } from 'next/cache'

const ACCEPTED_TYPES = ['application/json']

export async function getCorpuses() {
  return db.select({
    ...getTableColumns(corpus),
    documentsCount: count(document.id),
    annotationsCount: count(annotation.id),
  })
    .from(corpus)
    .leftJoin(document, eq(document.corpusId, corpus.id))
    .leftJoin(annotation, eq(annotation.documentId, document.id))
    .groupBy(corpus.id)
    .orderBy(desc(corpus.createdAt))
}

export async function addCorpus(title: string) {
  await db.insert(corpus).values({ title })
  revalidatePath('/')
}

export async function deleteCorpus(id: string) {
  await db.delete(corpus).where(eq(corpus.id, id))
  revalidatePath('/')
}

export async function importDocuments(corpusId: string, formData: FormData) {
  const file = formData.get('file') as File

  if (!file || !ACCEPTED_TYPES.includes(file.type)) {
    throw new UnsupportedFileTypeError('File type is not supported')
  }

  const content = await file.text()
  const importType = await determineImportType(content)
  if (importType === 'unknown') {
    throw new UnsupportedFileTypeError('File format is not supported')
  }

  const importedDocumentsIds: string[] = []

  if (importType === 'corpuswalker') {
    const lines = content.split('\n').filter(line => line.trim() !== '')
    for (const line of lines) {
      const parsedJson = JSON.parse(line)
      if (!('_index' in parsedJson)) {
        throw new InvalidJsonLinesError('JSON Lines file must have a "_index" field in each line')
      }

      const [documentId] = await db.insert(document).values({
        corpusId,
        title: parsedJson._source.identificationMetadata.title,
        type: 'text/x-wiki',
        raw: parsedJson as DocumentData,
      }).returning({ id: document.id })
      importedDocumentsIds.push(documentId.id)
    }
  } else if (importType === 'labelstudio') {
    const parsedJson = JSON.parse(content)
    for (const item of parsedJson) {
      // Convert Label Studio format to Corpus Walker format
      const raw: DocumentData = {
        _source: {
          identificationMetadata: {
            title: item.id,
            versionDate: item.created_at,
            wikidata: '',
            url: [],
          },
          extractionMetadata: [{
            texts: [{
              startOffset: 0,
              endOffset: item.data.text.length,
              value: item.data.text,
            }],
            tables: [],
          }],
        },
      }

      const [documentId] = await db.insert(document).values({
        corpusId,
        title: item.id,
        type: 'text/plain',
        raw,
      }).returning({ id: document.id })
      importedDocumentsIds.push(documentId.id)

      if (item.data.label) {
        for (const label of item.data.label) {
          const { start, end, text } = label
          const subjectAnnotation: AnnotationComponent = {
            id: Math.random().toString(),
            annotationStart: start,
            annotationEnd: end,
            annotationValue: text,
            annotationType: 'text',
            annotationTag: 'subject',
            elementIndex: 0,
            annotationCell: null,
            annotationRow: null,
            entityCustom: true,
            entityLabel: label.labels[0],
            entityValue: label.labels[0],
          }
          const predicateAnnotation: AnnotationComponent = {
            id: Math.random().toString(),
            annotationStart: start,
            annotationEnd: end,
            annotationValue: text,
            annotationType: 'text',
            annotationTag: 'predicate',
            elementIndex: 0,
            annotationCell: null,
            annotationRow: null,
            entityCustom: true,
            entityLabel: label.labels[0],
            entityValue: label.labels[0],
          }
          const objectAnnotation: AnnotationComponent = {
            id: Math.random().toString(),
            annotationStart: start,
            annotationEnd: end,
            annotationValue: text,
            annotationType: 'text',
            annotationTag: 'object',
            elementIndex: 0,
            annotationCell: null,
            annotationRow: null,
            entityCustom: true,
            entityLabel: label.labels[0],
            entityValue: label.labels[0],
          }
          addAnnotation(documentId.id, subjectAnnotation, {
            label: label.labels[0],
            value: label.labels[0],
            custom: true,
          }, predicateAnnotation, {
            label: label.labels[0],
            value: label.labels[0],
            custom: true,
          }, objectAnnotation, {
            label: label.labels[0],
            value: label.labels[0],
            custom: true,
          })
        }
      }
    }
  }

  revalidatePath('/')

  return {
    count: importedDocumentsIds.length,
  }
}

export async function getCorpus(id: string) {
  const [data] = await db.select().from(corpus).where(eq(corpus.id, id))
  return data
}

export async function getDocuments(corpusId: string): Promise<(Document & { annotationsCount: number })[]> {
  return db.select({
    ...getTableColumns(document),
    annotationsCount: count(annotation.id),
  })
    .from(document)
    .where(eq(document.corpusId, corpusId))
    .leftJoin(annotation, eq(annotation.documentId, document.id))
    .groupBy(document.id)
}

export async function getDocument(id: string): Promise<Document> {
  const [data] = await db.select().from(document).where(eq(document.id, id))
  return data
}

export async function markDocumentAsCompleted(id: string, value: Date | null) {
  await db.update(document).set({ completedAt: value }).where(eq(document.id, id))
  revalidatePath('/')
}

export async function deleteDocument(id: string) {
  await db.delete(document).where(eq(document.id, id))
  revalidatePath('/')
}

async function upsertAnnotationComponent(
  component: AnnotationComponent,
  entity: Entity | null,
  existingId?: string,
) {
  const values = {
    ...component,
    id: undefined,
    entityLabel: entity?.label,
    entityValue: entity?.value,
    entityCustom: entity?.custom,
  }

  if (existingId) {
    await db.update(annotationComponent).set(values).where(eq(annotationComponent.id, existingId))
    return existingId
  } else {
    const [result] = await db.insert(annotationComponent).values(values).returning({ id: annotationComponent.id })
    return result.id
  }
}

export async function addAnnotation(
  documentId: string,
  subjectAnnotation: AnnotationComponent,
  subjectEntity: Entity | null,
  predicateAnnotation: AnnotationComponent,
  predicateEntity: Entity | null,
  objectAnnotation: AnnotationComponent,
  objectEntity: Entity | null,
) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [subjectId, predicateId, objectId] = await Promise.all([
    upsertAnnotationComponent(subjectAnnotation, subjectEntity),
    upsertAnnotationComponent(predicateAnnotation, predicateEntity),
    upsertAnnotationComponent(objectAnnotation, objectEntity),
  ])

  const [annotationId] = await db.insert(annotation).values({
    documentId,
    subjectId,
    predicateId,
    objectId,
    userId,
  }).returning({ id: annotation.id })

  revalidatePath(`/document/${documentId}`)

  return annotationId.id
}

export async function updateAnnotation(
  id: string,
  subjectAnnotation: AnnotationComponent,
  subjectEntity: Entity | null,
  predicateAnnotation: AnnotationComponent,
  predicateEntity: Entity | null,
  objectAnnotation: AnnotationComponent,
  objectEntity: Entity | null,
) {
  const annotationData = await getAnnotationById(id)

  await Promise.all([
    upsertAnnotationComponent(subjectAnnotation, subjectEntity, annotationData.subject.id),
    upsertAnnotationComponent(predicateAnnotation, predicateEntity, annotationData.predicate.id),
    upsertAnnotationComponent(objectAnnotation, objectEntity, annotationData.object.id),
    db.update(annotation).set({ updatedAt: new Date() }).where(eq(annotation.id, id)),
  ])

  revalidatePath(`/document/${annotationData.documentId}`)
}

export async function getAnnotations(documentId: string): Promise<DocumentAnnotation[]> {
  const component1 = alias(annotationComponent, 'component1')
  const component2 = alias(annotationComponent, 'component2')
  const component3 = alias(annotationComponent, 'component3')

  return db.select({
    ...getTableColumns(annotation),
    subject: getTableColumns(component1),
    predicate: getTableColumns(component2),
    object: getTableColumns(component3),
    annotationId: annotation.id,
    documentId: annotation.documentId,
    corpusId: document.corpusId,
  })
    .from(annotation)
    .innerJoin(component1, eq(component1.id, annotation.subjectId))
    .innerJoin(component2, eq(component2.id, annotation.predicateId))
    .innerJoin(component3, eq(component3.id, annotation.objectId))
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(annotation.documentId, documentId))
}

export async function getAnnotationById(id: string): Promise<DocumentAnnotation> {
  const component1 = alias(annotationComponent, 'component1')
  const component2 = alias(annotationComponent, 'component2')
  const component3 = alias(annotationComponent, 'component3')

  const [data] = await db.select({
    ...getTableColumns(annotation),
    subject: getTableColumns(component1),
    predicate: getTableColumns(component2),
    object: getTableColumns(component3),
    annotationId: annotation.id,
    documentId: annotation.documentId,
    corpusId: document.corpusId,
  })
    .from(annotation)
    .innerJoin(component1, eq(component1.id, annotation.subjectId))
    .innerJoin(component2, eq(component2.id, annotation.predicateId))
    .innerJoin(component3, eq(component3.id, annotation.objectId))
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(annotation.id, id))
    .limit(1)

  return data
}

export async function deleteAnnotation(id: string) {
  const annotationData = await getAnnotationById(id)

  await db.transaction(async (trx) => {
    await trx.delete(annotation).where(eq(annotation.id, id))
    await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.subject.id))
    await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.predicate.id))
    await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.object.id))
  })

  revalidatePath(`/document/${annotationData.documentId}`)
}
