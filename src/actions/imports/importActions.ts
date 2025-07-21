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

  let importedDocumentsIds: string[] = []

  if (importType === 'irit-zip') {
    // Handle IRIT zip file import
    const zipBuffer = await file.arrayBuffer()
    importedDocumentsIds = await importIritDocuments(corpusId, zipBuffer)
  } else if (importType === 'corpuswalker') {
    // Handle Corpus Walker import
    importedDocumentsIds = await importCorpuswalkerDocuments(corpusId, content)
  } else if (importType === 'labelstudio') {
    // Handle Label Studio import
    importedDocumentsIds = await importLabelStudioDocuments(corpusId, content)
  } else if (importType === 'full-corpus-export') {
    // Handle full corpus export import
    const parsed = JSON.parse(content)
    importedDocumentsIds = await importFullCorpusExportDocuments(corpusId, parsed)
  }

  revalidatePath('/')

  return {
    count: importedDocumentsIds.length,
  }
}
