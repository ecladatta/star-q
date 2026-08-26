'use server'
import type { DocumentData } from '@/types/types'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'
import { buildTableDocumentData } from './csvDocumentData'
import { buildTextDocumentData } from './textDocumentData'

async function insertDocument(
  corpusId: string,
  title: string,
  raw: DocumentData,
  order: number,
): Promise<string> {
  const [inserted] = await db.insert(document).values({
    corpusId,
    title,
    raw,
    order,
  }).returning({ id: document.id })

  return inserted.id
}

export async function importTextDocument(
  corpusId: string,
  fileName: string,
  content: string,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  const documentData = buildTextDocumentData(fileName, content)
  const id = await insertDocument(
    corpusId,
    documentData._source.identificationMetadata.title ?? fileName,
    documentData,
    1,
  )

  return { ids: [id], errors: [], warnings: [] }
}

export async function importCsvDocument(
  corpusId: string,
  fileName: string,
  content: string,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  const documentData = buildTableDocumentData(fileName, content)
  const id = await insertDocument(
    corpusId,
    documentData._source.identificationMetadata.title ?? fileName,
    documentData,
    1,
  )

  return { ids: [id], errors: [], warnings: [] }
}
