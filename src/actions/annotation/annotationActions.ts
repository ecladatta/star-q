'use server'
import type { AnnotationComponent } from '@/db/schema'
import type { DocumentAnnotation, Entity, EntityType } from '@/types/types'
import { eq, getTableColumns } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { revalidatePath } from 'next/cache'
import { findOrCreateCorpusCustomEntity } from '@/actions/corpus/corpusActions'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, corpusCustomEntity, document } from '@/db/schema'

async function upsertAnnotationComponent(
  component: AnnotationComponent,
  entity: Entity | null,
  corpusId: string,
  existingId?: string,
) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  let entityCustomId: string | null = null
  let entityLabel: string | null = null
  let entityValue: string | null = null

  if (entity?.custom && entity.label && entity.value && entity.datatype) {
    // For custom entities, save to corpus custom entities and only store the ID
    const entityType = component.annotationTag as EntityType
    entityCustomId = await findOrCreateCorpusCustomEntity(
      corpusId,
      entity.label,
      entity.value,
      entity.datatype,
      entityType,
    )
    // Don't store label/value for custom entities, they'll be fetched from corpusCustomEntity
  } else if (entity && !entity.custom) {
    // For non-custom entities (Wikidata), store the label/value directly
    entityLabel = entity.label
    entityValue = entity.value
  }

  const values = {
    ...component,
    id: undefined,
    entityLabel,
    entityValue,
    entityCustom: entity?.custom,
    entityCustomId,
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

  // Get corpus ID from document
  const [doc] = await db.select({ corpusId: document.corpusId }).from(document).where(eq(document.id, documentId))
  if (!doc) {
    throw new Error('Document not found')
  }

  const [subjectId, predicateId, objectId] = await Promise.all([
    upsertAnnotationComponent(subjectAnnotation, subjectEntity, doc.corpusId),
    upsertAnnotationComponent(predicateAnnotation, predicateEntity, doc.corpusId),
    upsertAnnotationComponent(objectAnnotation, objectEntity, doc.corpusId),
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
    upsertAnnotationComponent(subjectAnnotation, subjectEntity, annotationData.corpusId!, annotationData.subject.id),
    upsertAnnotationComponent(predicateAnnotation, predicateEntity, annotationData.corpusId!, annotationData.predicate.id),
    upsertAnnotationComponent(objectAnnotation, objectEntity, annotationData.corpusId!, annotationData.object.id),
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
  const customEntity1 = alias(corpusCustomEntity, 'customEntity1')
  const customEntity2 = alias(corpusCustomEntity, 'customEntity2')
  const customEntity3 = alias(corpusCustomEntity, 'customEntity3')

  const results = await db.select({
    ...getTableColumns(annotation),
    subject: getTableColumns(component1),
    predicate: getTableColumns(component2),
    object: getTableColumns(component3),
    subjectCustomEntity: getTableColumns(customEntity1),
    predicateCustomEntity: getTableColumns(customEntity2),
    objectCustomEntity: getTableColumns(customEntity3),
    annotationId: annotation.id,
    documentId: annotation.documentId,
    corpusId: document.corpusId,
  })
    .from(annotation)
    .innerJoin(component1, eq(component1.id, annotation.subjectId))
    .innerJoin(component2, eq(component2.id, annotation.predicateId))
    .innerJoin(component3, eq(component3.id, annotation.objectId))
    .innerJoin(document, eq(document.id, annotation.documentId))
    .leftJoin(customEntity1, eq(customEntity1.id, component1.entityCustomId))
    .leftJoin(customEntity2, eq(customEntity2.id, component2.entityCustomId))
    .leftJoin(customEntity3, eq(customEntity3.id, component3.entityCustomId))
    .where(eq(annotation.documentId, documentId))

  // Map results to use custom entity data when available
  return results.map(result => ({
    ...result,
    subject: {
      ...result.subject,
      entityLabel: result.subject.entityCustom && result.subjectCustomEntity
        ? result.subjectCustomEntity.label
        : result.subject.entityLabel,
      entityValue: result.subject.entityCustom && result.subjectCustomEntity
        ? result.subjectCustomEntity.value
        : result.subject.entityValue,
      entityDatatype: result.subject.entityCustom && result.subjectCustomEntity
        ? result.subjectCustomEntity.datatype
        : result.subject.entityDatatype,
    },
    predicate: {
      ...result.predicate,
      entityLabel: result.predicate.entityCustom && result.predicateCustomEntity
        ? result.predicateCustomEntity.label
        : result.predicate.entityLabel,
      entityValue: result.predicate.entityCustom && result.predicateCustomEntity
        ? result.predicateCustomEntity.value
        : result.predicate.entityValue,
      entityDatatype: result.predicate.entityCustom && result.predicateCustomEntity
        ? result.predicateCustomEntity.datatype
        : result.predicate.entityDatatype,
    },
    object: {
      ...result.object,
      entityLabel: result.object.entityCustom && result.objectCustomEntity
        ? result.objectCustomEntity.label
        : result.object.entityLabel,
      entityValue: result.object.entityCustom && result.objectCustomEntity
        ? result.objectCustomEntity.value
        : result.object.entityValue,
      entityDatatype: result.object.entityCustom && result.objectCustomEntity
        ? result.objectCustomEntity.datatype
        : result.object.entityDatatype,
    },
  }))
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
  const customEntity1 = alias(corpusCustomEntity, 'customEntity1')
  const customEntity2 = alias(corpusCustomEntity, 'customEntity2')
  const customEntity3 = alias(corpusCustomEntity, 'customEntity3')

  const [result] = await db.select({
    ...getTableColumns(annotation),
    subject: getTableColumns(component1),
    predicate: getTableColumns(component2),
    object: getTableColumns(component3),
    subjectCustomEntity: getTableColumns(customEntity1),
    predicateCustomEntity: getTableColumns(customEntity2),
    objectCustomEntity: getTableColumns(customEntity3),
    annotationId: annotation.id,
    documentId: annotation.documentId,
    corpusId: document.corpusId,
  })
    .from(annotation)
    .innerJoin(component1, eq(component1.id, annotation.subjectId))
    .innerJoin(component2, eq(component2.id, annotation.predicateId))
    .innerJoin(component3, eq(component3.id, annotation.objectId))
    .innerJoin(document, eq(document.id, annotation.documentId))
    .leftJoin(customEntity1, eq(customEntity1.id, component1.entityCustomId))
    .leftJoin(customEntity2, eq(customEntity2.id, component2.entityCustomId))
    .leftJoin(customEntity3, eq(customEntity3.id, component3.entityCustomId))
    .where(eq(annotation.id, id))
    .limit(1)

  // Map result to use custom entity data when available
  return {
    ...result,
    subject: {
      ...result.subject,
      entityLabel: result.subject.entityCustom && result.subjectCustomEntity
        ? result.subjectCustomEntity.label
        : result.subject.entityLabel,
      entityValue: result.subject.entityCustom && result.subjectCustomEntity
        ? result.subjectCustomEntity.value
        : result.subject.entityValue,
      entityDatatype: result.subject.entityCustom && result.subjectCustomEntity
        ? result.subjectCustomEntity.datatype
        : result.subject.entityDatatype,
    },
    predicate: {
      ...result.predicate,
      entityLabel: result.predicate.entityCustom && result.predicateCustomEntity
        ? result.predicateCustomEntity.label
        : result.predicate.entityLabel,
      entityValue: result.predicate.entityCustom && result.predicateCustomEntity
        ? result.predicateCustomEntity.value
        : result.predicate.entityValue,
      entityDatatype: result.predicate.entityCustom && result.predicateCustomEntity
        ? result.predicateCustomEntity.datatype
        : result.predicate.entityDatatype,
    },
    object: {
      ...result.object,
      entityLabel: result.object.entityCustom && result.objectCustomEntity
        ? result.objectCustomEntity.label
        : result.object.entityLabel,
      entityValue: result.object.entityCustom && result.objectCustomEntity
        ? result.objectCustomEntity.value
        : result.object.entityValue,
      entityDatatype: result.object.entityCustom && result.objectCustomEntity
        ? result.objectCustomEntity.datatype
        : result.object.entityDatatype,
    },
  }
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

export async function deleteAnnotations(ids: string[]) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  if (ids.length === 0) {
    return
  }

  // Get all annotation data first
  const annotationsData = await Promise.all(ids.map(id => getAnnotationById(id)))

  await db.transaction(async (trx) => {
    // Delete all annotations
    for (const id of ids) {
      await trx.delete(annotation).where(eq(annotation.id, id))
    }

    // Delete all associated components
    for (const annotationData of annotationsData) {
      await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.subject.id))
      await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.predicate.id))
      await trx.delete(annotationComponent).where(eq(annotationComponent.id, annotationData.object.id))
    }
  })

  // Revalidate all unique document pages
  const uniqueDocumentIds = [...new Set(annotationsData.map(data => data.documentId))]
  for (const documentId of uniqueDocumentIds) {
    revalidatePath(`/document/${documentId}`)
  }
}
