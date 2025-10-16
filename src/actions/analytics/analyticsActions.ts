'use server'
import { and, count, countDistinct, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, corpus, document } from '@/db/schema'

export type CorpusAnalytics = {
  totalDocuments: number
  documentsWithAnnotations: number
  documentsWithoutAnnotations: number
  totalAnnotations: number
  completedDocuments: number
  textOnlyAnnotations: number
  tableOnlyAnnotations: number
  jointAnnotations: number
  uniqueProperties: number
  uniqueEntities: number
  propertyStats: Array<{
    label: string | null
    value: string | null
    count: number
    datatype: string | null
    isCustom: boolean
  }>
  entityStats: Array<{
    label: string | null
    value: string | null
    count: number
    datatype: string | null
    isCustom: boolean
  }>
  documentsByProperty: Map<string, Array<{
    documentId: string
    documentTitle: string
    annotationCount: number
  }>>
  documentsByEntity: Map<string, Array<{
    documentId: string
    documentTitle: string
    annotationCount: number
  }>>
  documentsByAnnotationType: {
    textOnly: Array<{
      documentId: string
      documentTitle: string
      annotationCount: number
    }>
    tableOnly: Array<{
      documentId: string
      documentTitle: string
      annotationCount: number
    }>
    joint: Array<{
      documentId: string
      documentTitle: string
      annotationCount: number
    }>
  }
}

export async function getCorpusAnalytics(corpusId: string): Promise<CorpusAnalytics> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  // Verify corpus exists and user has access
  const [corpusData] = await db.select().from(corpus).where(eq(corpus.id, corpusId))
  if (!corpusData) {
    throw new Error('Corpus not found')
  }

  // Get total documents
  const [totalDocsResult] = await db
    .select({ count: count() })
    .from(document)
    .where(eq(document.corpusId, corpusId))

  const totalDocuments = totalDocsResult.count

  // Get completed documents (documents with a completedAt timestamp)
  const [completedDocsResult] = await db
    .select({ count: count() })
    .from(document)
    .where(
      and(
        eq(document.corpusId, corpusId),
        isNotNull(document.completedAt),
      ),
    )

  const completedDocuments = completedDocsResult.count

  // Get documents with annotations
  const [docsWithAnnotationsResult] = await db
    .select({ count: countDistinct(annotation.documentId) })
    .from(annotation)
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(document.corpusId, corpusId))

  const documentsWithAnnotations = docsWithAnnotationsResult.count

  // Get total annotations count
  const [totalAnnotationsResult] = await db
    .select({ count: count() })
    .from(annotation)
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(document.corpusId, corpusId))

  const totalAnnotations = totalAnnotationsResult.count

  // Get text-only, table-only, and joint annotations
  // An annotation is joint if it has components from both text and table types
  const annotationsWithTypes = await db
    .select({
      annotationId: annotation.id,
      documentId: annotation.documentId,
      subjectType: sql<'text' | 'table'>`(SELECT annotation_type FROM ${annotationComponent} WHERE id = ${annotation.subjectId})`.as('subject_type'),
      predicateType: sql<'text' | 'table'>`(SELECT annotation_type FROM ${annotationComponent} WHERE id = ${annotation.predicateId})`.as('predicate_type'),
      objectType: sql<'text' | 'table'>`(SELECT annotation_type FROM ${annotationComponent} WHERE id = ${annotation.objectId})`.as('object_type'),
    })
    .from(annotation)
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(document.corpusId, corpusId))

  let textOnlyAnnotations = 0
  let tableOnlyAnnotations = 0
  let jointAnnotations = 0

  // Track which documents have which annotation types
  const textOnlyDocIds = new Set<string>()
  const tableOnlyDocIds = new Set<string>()
  const jointDocIds = new Set<string>()

  for (const anno of annotationsWithTypes) {
    const types = new Set([anno.subjectType, anno.predicateType, anno.objectType])

    if (types.has('text') && types.has('table')) {
      // Has both text and table components
      jointAnnotations++
      jointDocIds.add(anno.documentId)
    } else if (types.has('text')) {
      // Only text components
      textOnlyAnnotations++
      textOnlyDocIds.add(anno.documentId)
    } else if (types.has('table')) {
      // Only table components
      tableOnlyAnnotations++
      tableOnlyDocIds.add(anno.documentId)
    }
  }

  // Get unique properties (predicates only)
  const propertyStatsQuery = await db
    .select({
      label: annotationComponent.entityLabel,
      value: annotationComponent.entityValue,
      datatype: annotationComponent.entityDatatype,
      isCustom: annotationComponent.entityCustom,
      count: count(),
    })
    .from(annotationComponent)
    .innerJoin(
      annotation,
      sql`${annotationComponent.id} = ${annotation.predicateId}`,
    )
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(document.corpusId, corpusId))
    .groupBy(
      annotationComponent.entityLabel,
      annotationComponent.entityValue,
      annotationComponent.entityDatatype,
      annotationComponent.entityCustom,
    )
    .orderBy(desc(count()))

  const propertyStats = propertyStatsQuery.map(stat => ({
    label: stat.label,
    value: stat.value,
    datatype: stat.datatype,
    isCustom: stat.isCustom || false,
    count: stat.count,
  }))

  const uniqueProperties = propertyStats.length

  // Get unique entities (subjects and objects only)
  const entityStatsQuery = await db
    .select({
      label: annotationComponent.entityLabel,
      value: annotationComponent.entityValue,
      datatype: annotationComponent.entityDatatype,
      isCustom: annotationComponent.entityCustom,
      count: count(),
    })
    .from(annotationComponent)
    .innerJoin(
      annotation,
      sql`${annotationComponent.id} IN (${annotation.subjectId}, ${annotation.objectId})`,
    )
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(document.corpusId, corpusId))
    .groupBy(
      annotationComponent.entityLabel,
      annotationComponent.entityValue,
      annotationComponent.entityDatatype,
      annotationComponent.entityCustom,
    )
    .orderBy(desc(count()))

  const entityStats = entityStatsQuery.map(stat => ({
    label: stat.label,
    value: stat.value,
    datatype: stat.datatype,
    isCustom: stat.isCustom || false,
    count: stat.count,
  }))

  const uniqueEntities = entityStats.length

  // Get documents by property (predicates)
  const documentsByProperty = new Map<string, Array<{
    documentId: string
    documentTitle: string
    annotationCount: number
  }>>()

  // For each unique property, get the documents that have annotations with that property
  for (const property of propertyStats) {
    const docsForProperty = await db
      .select({
        documentId: document.id,
        documentTitle: document.title,
        annotationCount: count(annotation.id),
      })
      .from(document)
      .innerJoin(annotation, eq(annotation.documentId, document.id))
      .innerJoin(
        annotationComponent,
        sql`${annotationComponent.id} = ${annotation.predicateId}`,
      )
      .where(
        and(
          eq(document.corpusId, corpusId),
          property.label ? eq(annotationComponent.entityLabel, property.label) : sql`${annotationComponent.entityLabel} IS NULL`,
          property.value ? eq(annotationComponent.entityValue, property.value) : sql`${annotationComponent.entityValue} IS NULL`,
        ),
      )
      .groupBy(document.id, document.title)
      .orderBy(desc(count(annotation.id)))

    const propertyKey = `${property.label || 'null'}:${property.value || 'null'}`
    documentsByProperty.set(propertyKey, docsForProperty)
  }

  // Get documents by entity (subjects and objects)
  const documentsByEntity = new Map<string, Array<{
    documentId: string
    documentTitle: string
    annotationCount: number
  }>>()

  // For each unique entity, get the documents that have annotations with that entity
  for (const entity of entityStats) {
    const docsForEntity = await db
      .select({
        documentId: document.id,
        documentTitle: document.title,
        annotationCount: count(annotation.id),
      })
      .from(document)
      .innerJoin(annotation, eq(annotation.documentId, document.id))
      .innerJoin(
        annotationComponent,
        sql`${annotationComponent.id} IN (${annotation.subjectId}, ${annotation.objectId})`,
      )
      .where(
        and(
          eq(document.corpusId, corpusId),
          entity.label ? eq(annotationComponent.entityLabel, entity.label) : sql`${annotationComponent.entityLabel} IS NULL`,
          entity.value ? eq(annotationComponent.entityValue, entity.value) : sql`${annotationComponent.entityValue} IS NULL`,
        ),
      )
      .groupBy(document.id, document.title)
      .orderBy(desc(count(annotation.id)))

    const entityKey = `${entity.label || 'null'}:${entity.value || 'null'}`
    documentsByEntity.set(entityKey, docsForEntity)
  }

  // Get document details for each annotation type
  const getDocumentsByIds = async (docIds: Set<string>) => {
    if (docIds.size === 0) {
      return []
    }

    const docs = await db
      .select({
        documentId: document.id,
        documentTitle: document.title,
        annotationCount: count(annotation.id),
      })
      .from(document)
      .leftJoin(annotation, eq(annotation.documentId, document.id))
      .where(
        and(
          eq(document.corpusId, corpusId),
          sql`${document.id} IN (${sql.raw(Array.from(docIds).map(id => `'${id}'`).join(','))})`,
        ),
      )
      .groupBy(document.id, document.title)
      .orderBy(desc(count(annotation.id)))

    return docs
  }

  const textOnlyDocs = await getDocumentsByIds(textOnlyDocIds)
  const tableOnlyDocs = await getDocumentsByIds(tableOnlyDocIds)
  const jointDocs = await getDocumentsByIds(jointDocIds)

  return {
    totalDocuments,
    documentsWithAnnotations,
    documentsWithoutAnnotations: totalDocuments - documentsWithAnnotations,
    totalAnnotations,
    completedDocuments,
    textOnlyAnnotations,
    tableOnlyAnnotations,
    jointAnnotations,
    uniqueProperties,
    uniqueEntities,
    propertyStats,
    entityStats,
    documentsByProperty,
    documentsByEntity,
    documentsByAnnotationType: {
      textOnly: textOnlyDocs,
      tableOnly: tableOnlyDocs,
      joint: jointDocs,
    },
  }
}
