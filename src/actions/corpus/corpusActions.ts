'use server'
import type { Document } from '@/db/schema'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { annotation, corpus, document } from '@/db/schema'
import { count, countDistinct, desc, eq, getTableColumns, inArray } from 'drizzle-orm'
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

    // Insert annotations with updated document IDs
    if (annotations.length > 0) {
      await db.insert(annotation).values(
        annotations.map(anno => ({
          documentId: documentIdMap.get(anno.documentId)!,
          subjectId: anno.subjectId,
          predicateId: anno.predicateId,
          objectId: anno.objectId,
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
