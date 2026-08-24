'use server'
import type { AnnotationComponent } from '@/db/schema'
import type {
  AnnotationComponentRole,
  AnnotationQualifierInput,
  DocumentAnnotation,
  DocumentAnnotationQualifier,
  Entity,
} from '@/types/types'
import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { revalidatePath } from 'next/cache'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, annotationQualifier, corpusCustomEntity, document } from '@/db/schema'
import { entityTypeForComponentRole } from '@/lib/annotation-roles'
import { getOptionalUserId, requireAuth } from '@/lib/auth-utils'
import { requireViewDocument } from '@/lib/corpus-access'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbExecutor = typeof db | Transaction

type ComponentWithCustomEntity = {
  entityCustom: boolean | null
  entityLabel: string | null
  entityValue: string | null
  entityDatatype: DocumentAnnotation['subject']['entityDatatype']
}

type CustomEntityLike = {
  label: string
  value: string
  datatype: DocumentAnnotation['subject']['entityDatatype']
} | null

function resolveComponentCustomEntity<T extends ComponentWithCustomEntity>(
  component: T,
  customEntity: CustomEntityLike,
): T {
  return {
    ...component,
    entityLabel: component.entityCustom && customEntity ? customEntity.label : component.entityLabel,
    entityValue: component.entityCustom && customEntity ? customEntity.value : component.entityValue,
    entityDatatype: component.entityCustom && customEntity ? customEntity.datatype : component.entityDatatype,
  }
}

function customTypeForComponentRole(role: AnnotationComponentRole): 'entity' | 'relation' {
  return entityTypeForComponentRole(role) === 'predicate' ? 'relation' : 'entity'
}

async function findOrCreateAnnotationCustomEntity(
  executor: DbExecutor,
  corpusId: string,
  label: string,
  value: string,
  datatype: NonNullable<Entity['datatype']>,
  role: AnnotationComponentRole,
): Promise<string> {
  const customType = customTypeForComponentRole(role)
  const [existing] = await executor.select({
    id: corpusCustomEntity.id,
    label: corpusCustomEntity.label,
    datatype: corpusCustomEntity.datatype,
  })
    .from(corpusCustomEntity)
    .where(
      and(
        eq(corpusCustomEntity.corpusId, corpusId),
        eq(corpusCustomEntity.value, value),
        eq(corpusCustomEntity.customType, customType),
      ),
    )
    .limit(1)

  if (existing) {
    if (existing.label !== label || existing.datatype !== datatype) {
      await executor.update(corpusCustomEntity)
        .set({
          label,
          datatype,
          updatedAt: new Date(),
        })
        .where(eq(corpusCustomEntity.id, existing.id))
    }
    return existing.id
  }

  const [result] = await executor.insert(corpusCustomEntity).values({
    corpusId,
    label,
    value,
    datatype,
    customType,
  }).returning({ id: corpusCustomEntity.id })

  return result.id
}

async function upsertAnnotationComponent(
  component: AnnotationComponent,
  entity: Entity | null,
  corpusId: string,
  existingId?: string,
  executor: DbExecutor = db,
) {
  let entityCustomId: string | null = null
  let entityLabel: string | null = null
  let entityValue: string | null = null

  if (entity?.custom && entity.label && entity.value && entity.datatype) {
    // For custom entities, save to corpus custom entities and only store the ID
    entityCustomId = await findOrCreateAnnotationCustomEntity(
      executor,
      corpusId,
      entity.label,
      entity.value,
      entity.datatype,
      component.annotationTag,
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
    await executor.update(annotationComponent).set(values).where(eq(annotationComponent.id, existingId))
    return existingId
  } else {
    const [result] = await executor.insert(annotationComponent).values(values).returning({ id: annotationComponent.id })
    return result.id
  }
}

async function insertAnnotationQualifiers(
  executor: DbExecutor,
  annotationId: string,
  corpusId: string,
  qualifiers: AnnotationQualifierInput[],
) {
  for (const [index, qualifier] of qualifiers.entries()) {
    const predicateId = await upsertAnnotationComponent(
      qualifier.predicate,
      qualifier.predicateEntity,
      corpusId,
      undefined,
      executor,
    )
    const valueId = await upsertAnnotationComponent(
      qualifier.value,
      qualifier.valueEntity,
      corpusId,
      undefined,
      executor,
    )

    await executor.insert(annotationQualifier).values({
      annotationId,
      predicateId,
      valueId,
      position: index,
    })
  }
}

async function getQualifierComponentIds(
  executor: DbExecutor,
  annotationIds: string[],
): Promise<string[]> {
  if (annotationIds.length === 0) {
    return []
  }

  const rows = await executor.select({
    predicateId: annotationQualifier.predicateId,
    valueId: annotationQualifier.valueId,
  })
    .from(annotationQualifier)
    .where(inArray(annotationQualifier.annotationId, annotationIds))

  return rows.flatMap(row => [row.predicateId, row.valueId])
}

async function getQualifiersForAnnotations(annotationIds: string[]): Promise<Map<string, DocumentAnnotationQualifier[]>> {
  const qualifiersByAnnotation = new Map<string, DocumentAnnotationQualifier[]>()

  if (annotationIds.length === 0) {
    return qualifiersByAnnotation
  }

  const qualifierPredicate = alias(annotationComponent, 'qualifierPredicate')
  const qualifierValue = alias(annotationComponent, 'qualifierValue')
  const qualifierPredicateCustomEntity = alias(corpusCustomEntity, 'qualifierPredicateCustomEntity')
  const qualifierValueCustomEntity = alias(corpusCustomEntity, 'qualifierValueCustomEntity')

  const rows = await db.select({
    ...getTableColumns(annotationQualifier),
    predicate: getTableColumns(qualifierPredicate),
    value: getTableColumns(qualifierValue),
    predicateCustomEntity: getTableColumns(qualifierPredicateCustomEntity),
    valueCustomEntity: getTableColumns(qualifierValueCustomEntity),
  })
    .from(annotationQualifier)
    .innerJoin(qualifierPredicate, eq(qualifierPredicate.id, annotationQualifier.predicateId))
    .innerJoin(qualifierValue, eq(qualifierValue.id, annotationQualifier.valueId))
    .leftJoin(qualifierPredicateCustomEntity, eq(qualifierPredicateCustomEntity.id, qualifierPredicate.entityCustomId))
    .leftJoin(qualifierValueCustomEntity, eq(qualifierValueCustomEntity.id, qualifierValue.entityCustomId))
    .where(inArray(annotationQualifier.annotationId, annotationIds))
    .orderBy(asc(annotationQualifier.annotationId), asc(annotationQualifier.position))

  for (const row of rows) {
    const qualifier: DocumentAnnotationQualifier = {
      id: row.id,
      annotationId: row.annotationId,
      predicateId: row.predicateId,
      valueId: row.valueId,
      position: row.position,
      predicate: resolveComponentCustomEntity(row.predicate, row.predicateCustomEntity),
      value: resolveComponentCustomEntity(row.value, row.valueCustomEntity),
    }

    const existing = qualifiersByAnnotation.get(row.annotationId) ?? []
    existing.push(qualifier)
    qualifiersByAnnotation.set(row.annotationId, existing)
  }

  return qualifiersByAnnotation
}

export async function addAnnotation(
  documentId: string,
  subjectAnnotation: AnnotationComponent,
  subjectEntity: Entity | null,
  predicateAnnotation: AnnotationComponent,
  predicateEntity: Entity | null,
  objectAnnotation: AnnotationComponent,
  objectEntity: Entity | null,
  qualifiers: AnnotationQualifierInput[] = [],
) {
  await requireAuth()

  const userId = await getOptionalUserId()

  // Get corpus ID from document
  const [doc] = await db.select({ corpusId: document.corpusId }).from(document).where(eq(document.id, documentId))
  if (!doc) {
    throw new Error('Document not found')
  }

  const annotationId = await db.transaction(async (trx) => {
    const [subjectId, predicateId, objectId] = await Promise.all([
      upsertAnnotationComponent(subjectAnnotation, subjectEntity, doc.corpusId, undefined, trx),
      upsertAnnotationComponent(predicateAnnotation, predicateEntity, doc.corpusId, undefined, trx),
      upsertAnnotationComponent(objectAnnotation, objectEntity, doc.corpusId, undefined, trx),
    ])

    const [createdAnnotation] = await trx.insert(annotation).values({
      documentId,
      subjectId,
      predicateId,
      objectId,
      userId,
    }).returning({ id: annotation.id })

    await insertAnnotationQualifiers(trx, createdAnnotation.id, doc.corpusId, qualifiers)

    await trx.update(document).set({ updatedAt: new Date() }).where(eq(document.id, documentId))

    return createdAnnotation.id
  })

  revalidatePath(`/document/${documentId}`)

  return annotationId
}

export async function updateAnnotation(
  id: string,
  subjectAnnotation: AnnotationComponent,
  subjectEntity: Entity | null,
  predicateAnnotation: AnnotationComponent,
  predicateEntity: Entity | null,
  objectAnnotation: AnnotationComponent,
  objectEntity: Entity | null,
  qualifiers?: AnnotationQualifierInput[],
) {
  await requireAuth()

  const annotationData = await getAnnotationById(id)

  if (!annotationData.documentId) {
    throw new Error('Document ID not found in annotation')
  }

  await db.transaction(async (trx) => {
    await Promise.all([
      upsertAnnotationComponent(subjectAnnotation, subjectEntity, annotationData.corpusId!, annotationData.subject.id, trx),
      upsertAnnotationComponent(predicateAnnotation, predicateEntity, annotationData.corpusId!, annotationData.predicate.id, trx),
      upsertAnnotationComponent(objectAnnotation, objectEntity, annotationData.corpusId!, annotationData.object.id, trx),
    ])

    if (qualifiers !== undefined) {
      const oldQualifierComponentIds = await getQualifierComponentIds(trx, [id])

      await trx.delete(annotationQualifier).where(eq(annotationQualifier.annotationId, id))

      if (oldQualifierComponentIds.length > 0) {
        await trx.delete(annotationComponent).where(inArray(annotationComponent.id, oldQualifierComponentIds))
      }

      await insertAnnotationQualifiers(trx, id, annotationData.corpusId!, qualifiers)
    }

    await trx.update(annotation).set({ updatedAt: new Date() }).where(eq(annotation.id, id))
    await trx.update(document).set({ updatedAt: new Date() }).where(eq(document.id, annotationData.documentId!))
  })

  revalidatePath(`/document/${annotationData.documentId}`)
}

export async function getAnnotations(documentId: string): Promise<DocumentAnnotation[]> {
  await requireViewDocument(documentId)

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

  const qualifiersByAnnotation = await getQualifiersForAnnotations(results.map(result => result.id))

  return results.map(result => ({
    ...result,
    subject: resolveComponentCustomEntity(result.subject, result.subjectCustomEntity),
    predicate: resolveComponentCustomEntity(result.predicate, result.predicateCustomEntity),
    object: resolveComponentCustomEntity(result.object, result.objectCustomEntity),
    qualifiers: qualifiersByAnnotation.get(result.id) ?? [],
  }))
}

export async function getAnnotationById(id: string): Promise<DocumentAnnotation> {
  await requireAuth()

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

  if (!result) {
    throw new Error('Annotation not found')
  }

  const qualifiersByAnnotation = await getQualifiersForAnnotations([result.id])

  return {
    ...result,
    subject: resolveComponentCustomEntity(result.subject, result.subjectCustomEntity),
    predicate: resolveComponentCustomEntity(result.predicate, result.predicateCustomEntity),
    object: resolveComponentCustomEntity(result.object, result.objectCustomEntity),
    qualifiers: qualifiersByAnnotation.get(result.id) ?? [],
  }
}

export async function deleteAnnotation(id: string) {
  await requireAuth()

  const annotationData = await getAnnotationById(id)
  const baseComponentIds = [
    annotationData.subject.id,
    annotationData.predicate.id,
    annotationData.object.id,
  ]

  await db.transaction(async (trx) => {
    const qualifierComponentIds = await getQualifierComponentIds(trx, [id])
    const componentIds = [...baseComponentIds, ...qualifierComponentIds]

    await trx.delete(annotation).where(eq(annotation.id, id))
    await trx.delete(annotationComponent).where(inArray(annotationComponent.id, componentIds))

    if (annotationData.documentId) {
      await trx.update(document).set({ updatedAt: new Date() }).where(eq(document.id, annotationData.documentId))
    }
  })

  revalidatePath(`/document/${annotationData.documentId}`)
}

export async function deleteAnnotations(ids: string[]) {
  await requireAuth()

  if (ids.length === 0) {
    return
  }

  const uniqueAnnotationIds = [...new Set(ids)]
  const annotationsData = await db.select({
    documentId: annotation.documentId,
    subjectId: annotation.subjectId,
    predicateId: annotation.predicateId,
    objectId: annotation.objectId,
  })
    .from(annotation)
    .where(inArray(annotation.id, uniqueAnnotationIds))

  if (annotationsData.length !== uniqueAnnotationIds.length) {
    throw new Error('Annotation not found')
  }

  const uniqueDocumentIds = [...new Set(
    annotationsData
      .map(data => data.documentId)
      .filter((id): id is string => id !== null && id !== undefined),
  )]

  await db.transaction(async (trx) => {
    const qualifierComponentIds = await getQualifierComponentIds(trx, uniqueAnnotationIds)
    const componentIds = annotationsData.flatMap(annotationData => [
      annotationData.subjectId,
      annotationData.predicateId,
      annotationData.objectId,
    ])

    // Delete all annotations
    await trx.delete(annotation).where(inArray(annotation.id, uniqueAnnotationIds))

    // Delete all associated components
    if (componentIds.length > 0 || qualifierComponentIds.length > 0) {
      await trx
        .delete(annotationComponent)
        .where(inArray(annotationComponent.id, [...componentIds, ...qualifierComponentIds]))
    }

    if (uniqueDocumentIds.length > 0) {
      await trx
        .update(document)
        .set({ updatedAt: new Date() })
        .where(inArray(document.id, uniqueDocumentIds))
    }
  })

  // Revalidate all unique document pages
  for (const documentId of uniqueDocumentIds) {
    revalidatePath(`/document/${documentId}`)
  }
}
