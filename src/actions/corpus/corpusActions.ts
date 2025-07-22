'use server'
import type { Column, SQL, SQLWrapper } from 'drizzle-orm'
import type { CorpusCustomEntity, Document } from '@/db/schema'
import { and, count, countDistinct, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, corpus, corpusCustomEntity, document } from '@/db/schema'

export type DocumentMetadata = Omit<Document, 'raw'> & { annotationsCount: number }

export async function getCorpuses() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  return db.select({
    ...getTableColumns(corpus),
    documentsCount: countDistinct(document.id),
    annotationsCount: count(annotation.id),
  })
    .from(corpus)
    .leftJoin(document, eq(document.corpusId, corpus.id))
    .leftJoin(annotation, eq(annotation.documentId, document.id))
    .groupBy(corpus.id)
    .orderBy(desc(corpus.createdAt))
}

export async function addCorpus(title: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [result] = await db.insert(corpus).values({ title }).returning({ id: corpus.id })
  revalidatePath('/')
  return result
}

export async function deleteCorpus(id: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  await db.delete(corpus).where(eq(corpus.id, id))
  revalidatePath('/')
}

export async function getCorpus(id: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [data] = await db.select().from(corpus).where(eq(corpus.id, id))
  return data
}

export async function duplicateCorpus(id: string, newTitle?: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [originalCorpus] = await db.select().from(corpus).where(eq(corpus.id, id))
  if (!originalCorpus) {
    throw new Error('Corpus not found')
  }

  const title = newTitle || `${originalCorpus.title} (copy)`
  const [newCorpus] = await db.insert(corpus).values({ title }).returning()

  // Copy custom entities first and create mapping
  const customEntities = await db.select().from(corpusCustomEntity).where(eq(corpusCustomEntity.corpusId, id))
  const customEntityIdMap = new Map<string, string>()

  if (customEntities.length > 0) {
    const newCustomEntities = await db.insert(corpusCustomEntity)
      .values(
        customEntities.map(entity => ({
          corpusId: newCorpus.id,
          label: entity.label,
          value: entity.value,
          datatype: entity.datatype,
          customType: entity.customType,
        })),
      )
      .returning()

    // Create mapping of old custom entity IDs to new custom entity IDs
    customEntities.forEach((oldEntity, index) => {
      customEntityIdMap.set(oldEntity.id, newCustomEntities[index].id)
    })
  }

  const documents = await db.select().from(document).where(eq(document.corpusId, id))

  // Create a mapping from old document IDs to new document IDs to link annotations
  const documentIdMap = new Map<string, string>()

  if (documents.length > 0) {
    const newDocuments = await db.insert(document)
      .values(
        documents.map(doc => ({
          corpusId: newCorpus.id,
          title: doc.title,
          raw: doc.raw,
        })),
      )
      .returning()

    // Create mapping of old document IDs to new document IDs
    documents.forEach((oldDoc, index) => {
      documentIdMap.set(oldDoc.id, newDocuments[index].id)
    })
  }

  if (documentIdMap.size > 0) {
    // Get all annotations for the documents in the original corpus
    const oldDocIds = Array.from(documentIdMap.keys())
    const annotations = await db.select()
      .from(annotation)
      .where(inArray(annotation.documentId, oldDocIds))

    if (annotations.length > 0) {
      // Get all annotation components that are referenced by these annotations
      const componentIds = [
        ...annotations.map(anno => anno.subjectId),
        ...annotations.map(anno => anno.predicateId),
        ...annotations.map(anno => anno.objectId),
      ]

      const components = await db.select()
        .from(annotationComponent)
        .where(inArray(annotationComponent.id, componentIds))

      // Create new annotation components with updated custom entity IDs
      const componentIdMap = new Map<string, string>()

      if (components.length > 0) {
        const newComponents = await db.insert(annotationComponent)
          .values(
            components.map(comp => ({
              entityLabel: comp.entityLabel,
              entityValue: comp.entityValue,
              entityCustom: comp.entityCustom,
              // Map old custom entity ID to new custom entity ID
              entityCustomId: comp.entityCustomId ? customEntityIdMap.get(comp.entityCustomId) || null : null,
              entityDatatype: comp.entityDatatype,
              annotationStart: comp.annotationStart,
              annotationEnd: comp.annotationEnd,
              annotationRow: comp.annotationRow,
              annotationCell: comp.annotationCell,
              annotationValue: comp.annotationValue,
              annotationType: comp.annotationType,
              annotationTag: comp.annotationTag,
              elementIndex: comp.elementIndex,
            })),
          )
          .returning()

        // Create mapping of old component IDs to new component IDs
        components.forEach((oldComponent, index) => {
          componentIdMap.set(oldComponent.id, newComponents[index].id)
        })
      }

      // Insert annotations with updated document IDs and component IDs
      await db.insert(annotation).values(
        annotations.map(anno => ({
          documentId: documentIdMap.get(anno.documentId)!,
          subjectId: componentIdMap.get(anno.subjectId)!,
          predicateId: componentIdMap.get(anno.predicateId)!,
          objectId: componentIdMap.get(anno.objectId)!,
          userId: anno.userId,
          createdAt: anno.createdAt,
          updatedAt: anno.updatedAt,
        })),
      )
    }
  }

  revalidatePath('/')
  return newCorpus
}

export async function renameCorpus(id: string, newTitle: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  await db.update(corpus).set({ title: newTitle }).where(eq(corpus.id, id))
  revalidatePath('/')
}

export async function getCorpusCustomEntities(corpusId: string): Promise<CorpusCustomEntity[]> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  return db.select().from(corpusCustomEntity).where(eq(corpusCustomEntity.corpusId, corpusId))
}

export async function addCorpusCustomEntity(corpusId: string, label: string, value: string, datatype: string, customType: 'entity' | 'relation') {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [result] = await db.insert(corpusCustomEntity).values({
    corpusId,
    label,
    value,
    datatype: datatype as any,
    customType,
  }).returning({ id: corpusCustomEntity.id })
  revalidatePath(`/corpus/${corpusId}`)
  return result.id
}

export async function findOrCreateCorpusCustomEntity(corpusId: string, label: string, value: string, datatype: string, entityType: 'subject' | 'predicate' | 'object') {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  // Map entityType to customType
  const customType: 'entity' | 'relation' = entityType === 'predicate' ? 'relation' : 'entity'

  // First try to find existing entity with same value and type
  const [existing] = await db.select()
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
    return existing.id
  }

  // Create new entity if not found
  const [result] = await db.insert(corpusCustomEntity).values({
    corpusId,
    label,
    value,
    datatype: datatype as any,
    customType,
  }).returning({ id: corpusCustomEntity.id })

  revalidatePath(`/corpus/${corpusId}`)
  return result.id
}

export async function updateCorpusCustomEntity(id: string, label: string, value: string, datatype: string, customType: 'entity' | 'relation') {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  await db.update(corpusCustomEntity).set({
    label,
    value,
    datatype: datatype as any,
    customType,
    updatedAt: new Date(),
  }).where(eq(corpusCustomEntity.id, id))
  revalidatePath(`/corpus/*`)
}

export async function deleteCorpusCustomEntity(id: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  await db.delete(corpusCustomEntity).where(eq(corpusCustomEntity.id, id))
  revalidatePath(`/corpus/*`)
}

function levenshtein(
  source: Column,
  text: string | SQLWrapper,
  insCost = 1,
  delCost = 1,
  subCost = 1,
): SQL {
  return sql`levenshtein(${source}, ${text}, ${insCost}, ${delCost}, ${subCost})`
}

export async function searchCorpusCustomEntities(corpusId: string, searchTerm: string, entityType: 'subject' | 'predicate' | 'object') {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  // Map entityType to customType
  const customType: 'entity' | 'relation' = entityType === 'predicate' ? 'relation' : 'entity'

  const searchPattern = `%${searchTerm}%`

  return db.select()
    .from(corpusCustomEntity)
    .where(
      and(
        eq(corpusCustomEntity.corpusId, corpusId),
        eq(corpusCustomEntity.customType, customType),
        sql`(${corpusCustomEntity.label} ILIKE ${searchPattern} OR ${corpusCustomEntity.value} ILIKE ${searchPattern})`,
      ),
    )
    .orderBy(
      levenshtein(corpusCustomEntity.label, searchTerm),
      levenshtein(corpusCustomEntity.value, searchTerm),
    )
    .limit(10)
}
