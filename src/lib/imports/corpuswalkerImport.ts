'use server'
import type { DocumentData } from '@/types/types'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'

/**
 * Imports documents from a Corpus Walker formatted JSON Lines file
 */
export async function importCorpuswalkerDocuments(
  corpusId: string,
  content: string,
): Promise<{ ids: string[], errors: string[] }> {
  const importedDocumentsIds: string[] = []
  const errors: string[] = []
  const lines = content.split('\n').filter(line => line.trim() !== '')

  for (const [index, line] of lines.entries()) {
    try {
      const parsedJson = JSON.parse(line) as DocumentData
      if (!('_index' in parsedJson)) {
        errors.push('JSON Lines file must have a "_index" field in each line')
        continue
      }

      const [documentId] = await db.insert(document).values({
        corpusId,
        title: parsedJson._source.identificationMetadata.title || parsedJson._source.identificationMetadata.id,
        raw: parsedJson as DocumentData,
        order: index + 1,
      }).returning({ id: document.id })

      importedDocumentsIds.push(documentId.id)
    } catch (err) {
      errors.push(`Error importing document: ${err}`)
      continue
    }
  }

  return { ids: importedDocumentsIds, errors }
}
