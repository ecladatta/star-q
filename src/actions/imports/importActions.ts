'use server'
import { revalidatePath } from 'next/cache'
import { importCorpuswalkerDocuments } from '@/lib/imports/corpuswalkerImport'
import { importFullCorpusExportDocuments } from '@/lib/imports/fullCorpusImport'
import { importIritDocuments } from '@/lib/imports/iritImport'
import { importLabelStudioDocuments } from '@/lib/imports/labelstudioImport'
import { determineImportType, UnsupportedFileTypeError } from '@/lib/utils'

/**
 * Main import function that determines the file type and routes to the appropriate importer
 */
export async function importDocuments(corpusId: string, formData: FormData) {
  const file = formData.get('file') as File

  if (!file) {
    throw new Error('File not found')
  }

  // Determine import type based on file content and name
  const content = await file.text()
  const importType = await determineImportType(content, file.name)

  if (importType === 'unknown') {
    throw new UnsupportedFileTypeError('File format is not supported')
  }

  let result: { ids: string[], errors: string[] } = { ids: [], errors: [] }

  switch (importType) {
    case 'irit-zip': {
      const zipBuffer = await file.arrayBuffer()
      result = await importIritDocuments(corpusId, zipBuffer)
      break
    }
    case 'corpuswalker': {
      result = await importCorpuswalkerDocuments(corpusId, content)
      break
    }
    case 'labelstudio': {
      result = await importLabelStudioDocuments(corpusId, content)
      break
    }
    case 'full-corpus-export': {
      const parsed = JSON.parse(content)
      result = await importFullCorpusExportDocuments(corpusId, parsed)
      break
    }
    default:
      // Should not reach here due to earlier error throw
      break
  }

  revalidatePath('/')

  return {
    count: result.ids.length,
    errors: result.errors,
  }
}
