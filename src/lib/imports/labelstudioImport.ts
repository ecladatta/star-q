'use server'
import type { DocumentAnnotationComponent, DocumentData } from '@/types/types'
import { v4 as uuidv4 } from 'uuid'
import { addAnnotation } from '@/actions/annotation/annotationActions'
import { db } from '@/db/drizzle'

import { document } from '@/db/schema'

/**
 * Imports documents from a Label Studio formatted JSON file
 */
export async function importLabelStudioDocuments(
  corpusId: string,
  content: string,
): Promise<{ ids: string[], errors: string[] }> {
  const importedDocumentsIds: string[] = []
  const errors: string[] = []
  let parsedJson: any[] = []
  try {
    parsedJson = JSON.parse(content)
  } catch (err) {
    errors.push(`Error parsing JSON: ${err}`)
    return { ids: importedDocumentsIds, errors }
  }

  if (!Array.isArray(parsedJson) || parsedJson.length === 0) {
    errors.push('Not a Label Studio export. Expected a non-empty JSON array of tasks.')
    return { ids: importedDocumentsIds, errors }
  }

  for (const [index, item] of parsedJson.entries()) {
    try {
      // Convert Label Studio format to Corpus Walker format
      const raw: DocumentData = {
        _source: {
          identificationMetadata: {
            id: item.id,
            title: item.id,
            versionDate: item.created_at,
            hash: item.id,
            wikidata: '',
            url: [],
          },
          extractionMetadata: [{
            technology: null,
            texts: [{
              startOffset: 0,
              endOffset: item.data.text.length,
              value: item.data.text,
            }],
            tables: [],
          }],
        },
      }

      const [documentId] = await db.insert(document).values({
        corpusId,
        title: item.id,
        raw,
        order: index + 1,
      }).returning({ id: document.id })

      importedDocumentsIds.push(documentId.id)

      // Import annotations if they exist
      if (item.data.label) {
        for (const label of item.data.label) {
          try {
            const { start, end, text } = label
            const subjectAnnotation: DocumentAnnotationComponent = {
              id: uuidv4(),
              annotationStart: start,
              annotationEnd: end,
              annotationValue: text,
              annotationType: 'text',
              annotationTag: 'subject',
              elementIndex: 0,
              annotationCell: null,
              annotationRow: null,
              entityCustom: true,
              entityCustomId: null,
              entityDatatype: 'string',
              entityLabel: label.labels[0],
              entityValue: label.labels[0],
            }

            const predicateAnnotation: DocumentAnnotationComponent = {
              id: uuidv4(),
              annotationStart: start,
              annotationEnd: end,
              annotationValue: text,
              annotationType: 'text',
              annotationTag: 'predicate',
              elementIndex: 0,
              annotationCell: null,
              annotationRow: null,
              entityCustom: true,
              entityCustomId: null,
              entityDatatype: 'string',
              entityLabel: label.labels[0],
              entityValue: label.labels[0],
            }

            const objectAnnotation: DocumentAnnotationComponent = {
              id: uuidv4(),
              annotationStart: start,
              annotationEnd: end,
              annotationValue: text,
              annotationType: 'text',
              annotationTag: 'object',
              elementIndex: 0,
              annotationCell: null,
              annotationRow: null,
              entityCustom: true,
              entityCustomId: null,
              entityDatatype: 'string',
              entityLabel: label.labels[0],
              entityValue: label.labels[0],
            }

            await addAnnotation(
              documentId.id,
              subjectAnnotation,
              {
                label: label.labels[0],
                value: label.labels[0],
                custom: true,
                customId: null,
                datatype: 'string',
                type: 'subject',
              },
              predicateAnnotation,
              {
                label: label.labels[0],
                value: label.labels[0],
                custom: true,
                customId: null,
                datatype: 'string',
                type: 'predicate',
              },
              objectAnnotation,
              {
                label: label.labels[0],
                value: label.labels[0],
                custom: true,
                customId: null,
                datatype: 'string',
                type: 'object',
              },
            )
          } catch (annErr) {
            errors.push(`Error importing annotation for document ${item.id}: ${annErr}`)
            continue
          }
        }
      }
    } catch (docErr) {
      errors.push(`Error importing document ${item.id}: ${docErr}`)
      continue
    }
  }

  return { ids: importedDocumentsIds, errors }
}
