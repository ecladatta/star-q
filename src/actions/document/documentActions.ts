'use server'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Document } from '@/db/schema'
import type { DocumentData } from '@/types/types'
import { count, eq, getTableColumns } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, document } from '@/db/schema'

export async function getDocumentsMetadata(corpusId: string): Promise<DocumentMetadata[]> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const { raw, ...documentColumns } = getTableColumns(document)
  return db.select({
    ...documentColumns,
    annotationsCount: count(annotation.id),
  })
    .from(document)
    .where(eq(document.corpusId, corpusId))
    .leftJoin(annotation, eq(annotation.documentId, document.id))
    .groupBy(document.id)
    .orderBy(document.createdAt)
}

export async function getDocument(id: string): Promise<Document> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [data] = await db.select().from(document).where(eq(document.id, id))
  return data
}

export async function getRawDocumentData(id: string): Promise<DocumentData | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [data] = await db.select({ raw: document.raw }).from(document).where(eq(document.id, id))
  return data?.raw || null
}

export async function markDocumentAsCompleted(id: string, value: Date | null) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const [doc] = await db.select({ corpusId: document.corpusId }).from(document).where(eq(document.id, id))
  await db.update(document).set({ completedAt: value }).where(eq(document.id, id))
  revalidatePath(`/document/${id}`)
  if (doc?.corpusId) {
    revalidatePath(`/corpus/${doc.corpusId}`)
  }
}

export async function deleteDocument(id: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new Error('User not authenticated')
  }

  await db.delete(document).where(eq(document.id, id))
  revalidatePath('/')
}
