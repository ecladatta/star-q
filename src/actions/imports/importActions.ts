'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db/drizzle'
import { corpus } from '@/db/schema'
import { requireAuth } from '@/lib/auth-utils'
import { importCorpuswalkerDocuments } from '@/lib/imports/corpuswalkerImport'
import { importFullCorpusExportDocuments } from '@/lib/imports/fullCorpusImport'
import { importIritDocuments } from '@/lib/imports/iritImport'
import { importLabelStudioDocuments } from '@/lib/imports/labelstudioImport'
import { determineImportType } from '@/lib/utils'

type ImportDocumentsResult = {
  count: number
  errors: string[]
}

type CreateCorpusWithDocumentsImportResult = ImportDocumentsResult & {
  corpusId: string | null
}

function importError(message: string): ImportDocumentsResult {
  return {
    count: 0,
    errors: [message],
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
  await requireAuth()

  const file = formData.get('file') as File

  if (!file) {
    return importError('No file was provided for import.')
  }

  // Determine import type based on file content and name
  const content = await file.text()
  const importType = await determineImportType(content, file.name)

  if (importType === 'unknown') {
    return importError('Could not determine file format. Please upload a JSON, JSONL, or ZIP file.')
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

export async function createCorpusWithDocumentsImport(
  title: string,
  formData: FormData,
): Promise<CreateCorpusWithDocumentsImportResult> {
  await requireAuth()

  const [newCorpus] = await db.insert(corpus).values({ title }).returning({ id: corpus.id })

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
