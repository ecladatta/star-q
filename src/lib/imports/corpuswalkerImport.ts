'use server'
import type { DocumentData } from '@/types/types'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'
import { InvalidJsonLinesError } from '@/lib/utils'

/**
 * Imports documents from a Corpus Walker formatted JSON Lines file
 */
export async function importCorpuswalkerDocuments(corpusId: string, content: string): Promise<string[]> {
  const importedDocumentsIds: string[] = []
  const lines = content.split('\n').filter(line => line.trim() !== '')

  for (const line of lines) {
    const parsedJson = JSON.parse(line) as DocumentData
    if (!('_index' in parsedJson)) {
      throw new InvalidJsonLinesError('JSON Lines file must have a "_index" field in each line')
    }

    const [documentId] = await db.insert(document).values({
      corpusId,
      title: parsedJson._source.identificationMetadata.title || parsedJson._source.identificationMetadata.id,
      raw: parsedJson as DocumentData,
    }).returning({ id: document.id })

    importedDocumentsIds.push(documentId.id)
  }

  return importedDocumentsIds
}
