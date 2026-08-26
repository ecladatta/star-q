'use server'
import type { CorpusImportFormat } from '@/lib/imports/import-format'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db/drizzle'
import { corpus } from '@/db/schema'
import { requireAuth } from '@/lib/auth-utils'
import { importCorpuswalkerDocuments } from '@/lib/imports/corpuswalkerImport'
import { importFullCorpusExportDocuments } from '@/lib/imports/fullCorpusImport'
import {
  CORPUS_IMPORT_FORMATS,
  isCorpusImportFormat,
} from '@/lib/imports/import-format'
import { importIritDocuments } from '@/lib/imports/iritImport'
import { importLabelStudioDocuments } from '@/lib/imports/labelstudioImport'
import { importTextDocument } from '@/lib/imports/textDocumentImport'

type ImportDocumentsResult = {
  count: number
  errors: string[]
  warnings: string[]
}

type CreateCorpusWithDocumentsImportResult = ImportDocumentsResult & {
  corpusId: string | null
}

function importError(message: string): ImportDocumentsResult {
  return {
    count: 0,
    errors: [message],
    warnings: [],
  }
}

async function removeCorpus(id: string) {
  await db.delete(corpus).where(eq(corpus.id, id))
  revalidatePath('/')
}

function fileExtension(fileName: string): string {
  const lastSegment = fileName.split('/').pop() ?? ''
  const dotIndex = lastSegment.lastIndexOf('.')
  return dotIndex >= 0 ? lastSegment.slice(dotIndex).toLowerCase() : ''
}

/**
 * Main import function that routes the file to the importer for the selected format
 */
export async function importDocuments(
  corpusId: string,
  format: CorpusImportFormat,
  formData: FormData,
): Promise<ImportDocumentsResult> {
  await requireAuth()

  if (!isCorpusImportFormat(format)) {
    return importError('Unknown import format.')
  }

  const file = formData.get('file') as File

  if (!file) {
    return importError('No file was provided for import.')
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
  }

  revalidatePath('/')

  return {
    count: result.ids.length,
    errors: result.errors,
    warnings: [...warnings, ...(result.warnings ?? [])],
  }
}

export async function createCorpusWithDocumentsImport(
  title: string,
  format: CorpusImportFormat,
  formData: FormData,
): Promise<CreateCorpusWithDocumentsImportResult> {
  await requireAuth()

  const [newCorpus] = await db.insert(corpus).values({ title }).returning({ id: corpus.id })

  try {
    const result = await importDocuments(newCorpus.id, format, formData)

    if (result.errors.length > 0) {
      await removeCorpus(newCorpus.id)
      return {
        ...result,
        corpusId: null,
      }
    }

    return {
      ...result,
      corpusId: newCorpus.id,
    }
  } catch (error) {
    await removeCorpus(newCorpus.id)
    throw error
  }
}
