'use server'
import type { CorpusImportFormat } from '@/lib/imports/import-format'
import { revalidatePath } from 'next/cache'
import { MAX_IMPORT_FILE_SIZE_BYTES } from '@/lib/config'
import { requireEditCorpus } from '@/lib/corpus-access'
import { importCorpuswalkerDocuments } from '@/lib/imports/corpuswalkerImport'
import { fileExtension } from '@/lib/imports/documentFileClassifier'
import {
  importCsvDocument,
  importDocumentsZip,
  importTextDocument,
  importUrlDocument,
  importWikitextDocument,
} from '@/lib/imports/documentsImport'
import { importFullCorpusExportDocuments } from '@/lib/imports/fullCorpusImport'
import {
  CORPUS_IMPORT_FORMATS,
  isCorpusImportFormat,
} from '@/lib/imports/import-format'
import { importIritDocuments } from '@/lib/imports/iritImport'
import { importLabelStudioDocuments } from '@/lib/imports/labelstudioImport'

export type ImportDocumentsResult = {
  count: number
  errors: string[]
  warnings: string[]
}

function importError(message: string): ImportDocumentsResult {
  return {
    count: 0,
    errors: [message],
    warnings: [],
  }
}

export async function importDocumentsFromUrl(
  corpusId: string,
  url: string,
): Promise<ImportDocumentsResult> {
  await requireEditCorpus(corpusId)

  const result = await importUrlDocument(corpusId, url.trim())
  revalidatePath('/')

  return {
    count: result.ids.length,
    errors: result.errors,
    warnings: result.warnings,
  }
}

export async function importDocuments(
  corpusId: string,
  format: CorpusImportFormat,
  formData: FormData,
): Promise<ImportDocumentsResult> {
  await requireEditCorpus(corpusId)

  const file = formData.get('file') as File | null

  if (!file) {
    return importError('No file was provided for import.')
  }

  if (!isCorpusImportFormat(format)) {
    return importError('Unknown import format.')
  }

  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return importError(`File is too large. The maximum import size is ${MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024)} MB.`)
  }

  const warnings: string[] = []
  const extension = fileExtension(file.name)
  if (extension && !CORPUS_IMPORT_FORMATS[format].extensions.includes(extension)) {
    warnings.push(
      `File extension "${extension}" does not match the selected format "${CORPUS_IMPORT_FORMATS[format].label}".`,
    )
  }

  let result: { ids: string[], errors: string[], warnings?: string[] } = { ids: [], errors: [] }

  switch (format) {
    case 'irit-zip': {
      const zipBuffer = await file.arrayBuffer()
      result = await importIritDocuments(corpusId, zipBuffer)
      break
    }
    case 'corpuswalker': {
      const content = await file.text()
      result = await importCorpuswalkerDocuments(corpusId, content)
      break
    }
    case 'labelstudio': {
      const content = await file.text()
      result = await importLabelStudioDocuments(corpusId, content)
      break
    }
    case 'full-corpus-export': {
      const content = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        result = { ids: [], errors: ['Failed to parse the JSON file.'], warnings: [] }
        break
      }
      result = await importFullCorpusExportDocuments(corpusId, parsed)
      break
    }
    case 'text': {
      const content = await file.text()
      result = await importTextDocument(corpusId, file.name, content)
      break
    }
    case 'wikitext': {
      const content = await file.text()
      result = await importWikitextDocument(corpusId, file.name, content)
      break
    }
    case 'csv': {
      const content = await file.text()
      result = await importCsvDocument(corpusId, file.name, content)
      break
    }
    case 'documents-zip': {
      const zipBuffer = await file.arrayBuffer()
      result = await importDocumentsZip(corpusId, zipBuffer)
      break
    }
  }

  revalidatePath('/')

  return {
    count: result.ids.length,
    errors: result.errors,
    warnings: [...warnings, ...(result.warnings ?? [])],
  }
}
