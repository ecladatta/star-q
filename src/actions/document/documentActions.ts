'use server'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Document } from '@/db/schema'
import type { DocumentData } from '@/types/types'
import { and, count, eq, getTableColumns, ilike, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db/drizzle'
import { annotation, corpus, document } from '@/db/schema'
import { NotFoundError } from '@/lib/auth-utils'
import { requireEditCorpus, requireEditDocument, requireViewCorpus, requireViewDocument } from '@/lib/corpus-access'
import { isValidHttpUrl, normalizeSourceUrls, normalizeWikidataId } from '@/lib/document-metadata'

export async function getDocumentsMetadata(corpusId: string): Promise<DocumentMetadata[]> {
  await requireViewCorpus(corpusId)

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
  await requireViewDocument(id)

  const [data] = await db.select().from(document).where(eq(document.id, id))
  return data
}

export async function getRawDocumentData(id: string): Promise<DocumentData | null> {
  await requireViewDocument(id)

  const [data] = await db.select({ raw: document.raw }).from(document).where(eq(document.id, id))
  return data?.raw || null
}

export async function markDocumentsAsCompleted(ids: string[], value: Date | null) {
  const uniqueIds = [...new Set(ids)]
  const docs = await db
    .select({ corpusId: document.corpusId, id: document.id })
    .from(document)
    .where(inArray(document.id, uniqueIds))

  if (docs.length === 0 && uniqueIds.length === 0)
    return
  if (docs.length !== uniqueIds.length) {
    throw new NotFoundError('One or more documents were not found.')
  }

  const uniqueCorpusIds = [...new Set(docs.map(doc => doc.corpusId))]
  await Promise.all(uniqueCorpusIds.map(requireEditCorpus))

  await db.update(document).set({ completedAt: value }).where(inArray(document.id, uniqueIds))

  ids.forEach(id => revalidatePath(`/document/${id}`))
  uniqueCorpusIds.forEach(id => revalidatePath(`/corpus/${id}`))
}

export type DocumentMetadataUpdate = {
  title: string
  versionDate: string | null
  wikidataId: string | null
  sourceUrls: string[] | null
}

export async function updateDocumentMetadata(id: string, metadata: DocumentMetadataUpdate): Promise<void> {
  const corpusId = await requireEditDocument(id)

  const title = metadata.title.trim()
  if (!title) {
    throw new Error('Title cannot be empty.')
  }

  const wikidataId = normalizeWikidataId(metadata.wikidataId)
  if (metadata.wikidataId?.trim() && !wikidataId) {
    throw new Error('Wikidata ID must be a Q-id like Q123.')
  }

  const sourceUrls = normalizeSourceUrls(metadata.sourceUrls)
  for (const url of sourceUrls ?? []) {
    if (!isValidHttpUrl(url)) {
      throw new Error(`Invalid source URL: ${url}`)
    }
  }

  await db.update(document).set({
    title,
    wikidataId,
    sourceUrls,
    versionDate: metadata.versionDate?.trim() || null,
    updatedAt: new Date(),
  }).where(eq(document.id, id))

  revalidatePath(`/document/${id}`)
  revalidatePath(`/corpus/${corpusId}`)
}

export async function deleteDocuments(ids: string[]) {
  const uniqueIds = [...new Set(ids)]
  const docs = await db
    .select({ corpusId: document.corpusId, id: document.id })
    .from(document)
    .where(inArray(document.id, uniqueIds))

  if (docs.length === 0 && uniqueIds.length === 0)
    return
  if (docs.length !== uniqueIds.length) {
    throw new NotFoundError('One or more documents were not found.')
  }

  const uniqueCorpusIds = [...new Set(docs.map(doc => doc.corpusId))]
  await Promise.all(uniqueCorpusIds.map(requireEditCorpus))

  await db.delete(document).where(inArray(document.id, uniqueIds))

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

export type DocumentSearchResult = Pick<DocumentMetadata, 'id' | 'title'>

export async function searchDocumentsByTitle(corpusId: string, term: string, limit = 15): Promise<DocumentSearchResult[]> {
  await requireViewCorpus(corpusId)

  const trimmed = term.trim()
  if (!trimmed)
    return []

  const pattern = `%${trimmed.replace(/[\\%_]/g, '\\$&')}%`
  return db.select({ id: document.id, title: document.title })
    .from(document)
    .where(and(eq(document.corpusId, corpusId), ilike(document.title, pattern)))
    .orderBy(document.order)
    .limit(Math.min(Math.max(limit, 1), 50))
}
