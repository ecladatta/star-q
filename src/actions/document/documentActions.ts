'use server'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Document } from '@/db/schema'
import type { DocumentData } from '@/types/types'
import { count, eq, getTableColumns, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db/drizzle'
import { annotation, corpus, document } from '@/db/schema'
import { requireAuth } from '@/lib/auth-utils'

export async function getDocumentsMetadata(corpusId: string): Promise<DocumentMetadata[]> {
  await requireAuth()

  const { raw, ...documentColumns } = getTableColumns(document)
  return db.select({
    ...documentColumns,
    annotationsCount: count(annotation.id),
  })
    .from(document)
    .where(eq(document.corpusId, corpusId))
    .leftJoin(annotation, eq(annotation.documentId, document.id))
    .groupBy(document.id)
    .orderBy(document.order)
}

export async function getDocument(id: string): Promise<Document> {
  await requireAuth()

  const [data] = await db.select().from(document).where(eq(document.id, id))
  return data
}

export async function getRawDocumentData(id: string): Promise<DocumentData | null> {
  await requireAuth()

  const [data] = await db.select({ raw: document.raw }).from(document).where(eq(document.id, id))
  return data?.raw || null
}

export async function markDocumentsAsCompleted(ids: string[], value: Date | null) {
  await requireAuth()

  const docs = await db
    .select({ corpusId: document.corpusId, id: document.id })
    .from(document)
    .where(inArray(document.id, ids))

  if (docs.length === 0)
    return

  await db.update(document).set({ completedAt: value }).where(inArray(document.id, ids))

  const uniqueCorpusIds = Array.from(
    new Set(docs.map(d => d.corpusId).filter(Boolean)),
  ) as string[]

  ids.forEach(id => revalidatePath(`/document/${id}`))
  uniqueCorpusIds.forEach(id => revalidatePath(`/corpus/${id}`))
}

export async function deleteDocuments(ids: string[]) {
  await requireAuth()

  const docs = await db
    .select({ corpusId: document.corpusId, id: document.id })
    .from(document)
    .where(inArray(document.id, ids))

  if (docs.length === 0)
    return

  const uniqueCorpusIds = Array.from(
    new Set(docs.map(d => d.corpusId).filter(Boolean)),
  ) as string[]

  await db.delete(document).where(inArray(document.id, ids))

  if (uniqueCorpusIds.length) {
    await db
      .update(corpus)
      .set({ updatedAt: new Date() })
      .where(inArray(corpus.id, uniqueCorpusIds))
  }

  revalidatePath('/')
  ids.forEach(id => revalidatePath(`/document/${id}`))
  uniqueCorpusIds.forEach(id => revalidatePath(`/corpus/${id}`))
}
