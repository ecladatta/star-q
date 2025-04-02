'use server'
import type { DocumentAnnotation, Entity } from '@/app/corpus/[corpusId]/corpus-view'
import type { AnnotationComponent } from '@/db/schema'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, document } from '@/db/schema'
import { eq, getTableColumns } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { revalidatePath } from 'next/cache'

async function upsertAnnotationComponent(
  component: AnnotationComponent,
  entity: Entity | null,
  existingId?: string,
) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const values = {
    ...component,
    id: undefined,
    entityLabel: entity?.label,
    entityValue: entity?.value,
    entityCustom: entity?.custom,
    entityDatatype: entity?.datatype,
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
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

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
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

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
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

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
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const annotationData = await getAnnotationById(id)

  await db.transaction(async (trx) => {
    await trx.delete(annotation).where(eq(annotation.id, id))
    await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.subject.id))
    await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.predicate.id))
    await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.object.id))
  })

  revalidatePath(`/document/${annotationData.documentId}`)
}
