'use server'
import type { Document } from '@/db/schema'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, corpus, document } from '@/db/schema'
import { count, countDistinct, desc, eq, getTableColumns } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

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

  await db.insert(corpus).values({ title })
  revalidatePath('/')
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
