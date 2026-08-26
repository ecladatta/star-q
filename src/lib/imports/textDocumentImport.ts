'use server'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'
import { buildTextDocumentData } from './textDocumentData'

export async function importTextDocument(
  corpusId: string,
  fileName: string,
  content: string,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  const documentData = buildTextDocumentData(fileName, content)
  const [inserted] = await db.insert(document).values({
    corpusId,
    title: documentData._source.identificationMetadata.title ?? fileName,
    raw: documentData,
    order: 1,
  }).returning({ id: document.id })

  return { ids: [inserted.id], errors: [], warnings: [] }
}
