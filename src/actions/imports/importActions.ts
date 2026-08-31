'use server'
import type { CorpusOwnerInput } from '@/actions/corpus/corpusActions'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { addCorpus } from '@/actions/corpus/corpusActions'
import { db } from '@/db/drizzle'
import { corpus } from '@/db/schema'
import { MAX_IMPORT_FILE_SIZE_BYTES } from '@/lib/constants'
import { requireEditCorpus } from '@/lib/corpus-access'
import { importCorpuswalkerDocuments } from '@/lib/imports/corpuswalkerImport'
import { importFullCorpusExportDocuments } from '@/lib/imports/fullCorpusImport'
import { importIritDocuments } from '@/lib/imports/iritImport'
import { importLabelStudioDocuments } from '@/lib/imports/labelstudioImport'
import { determineImportType } from '@/lib/utils'

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

/**
 * Main import function that determines the file type and routes to the appropriate importer
 */
export async function importDocuments(corpusId: string, formData: FormData): Promise<ImportDocumentsResult> {
  await requireEditCorpus(corpusId)

  const file = formData.get('file') as File

  if (!file) {
    return importError('No file was provided for import.')
  }

  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return importError(`File is too large. The maximum import size is ${MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024)} MB.`)
  }

  // Determine import type based on file content and name
  const content = await file.text()
  const importType = await determineImportType(content, file.name)

  if (importType === 'unknown') {
    return importError('Could not determine file format. Please upload a JSON, JSONL, or ZIP file.')
  }

  let result: { ids: string[], errors: string[], warnings?: string[] } = { ids: [], errors: [] }

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
    warnings: result.warnings ?? [],
  }
}

export async function createCorpusWithDocumentsImport(
  title: string,
  owner: CorpusOwnerInput,
  formData: FormData,
): Promise<CreateCorpusWithDocumentsImportResult> {
  const newCorpus = await addCorpus(title, owner)

  try {
    const result = await importDocuments(newCorpus.id, formData)

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
