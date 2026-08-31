'use server'
import type { DocumentData } from '@/types/types'
import JSZip from 'jszip'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'
import { buildTableDocumentData } from './csvDocumentData'
import { classifyDocumentFile, DOCUMENT_FILE_EXTENSIONS } from './documentFileClassifier'
import { buildTextDocumentData } from './textDocumentData'

async function insertDocument(
  corpusId: string,
  title: string,
  raw: DocumentData,
  order: number,
): Promise<string> {
  const [inserted] = await db.insert(document).values({
    corpusId,
    title,
    raw,
    order,
  }).returning({ id: document.id })

  return inserted.id
}

export async function importTextDocument(
  corpusId: string,
  fileName: string,
  content: string,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  const documentData = buildTextDocumentData(fileName, content)
  const id = await insertDocument(
    corpusId,
    documentData._source.identificationMetadata.title ?? fileName,
    documentData,
    1,
  )

  return { ids: [id], errors: [], warnings: [] }
}

export async function importCsvDocument(
  corpusId: string,
  fileName: string,
  content: string,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  const documentData = buildTableDocumentData(fileName, content)
  const id = await insertDocument(
    corpusId,
    documentData._source.identificationMetadata.title ?? fileName,
    documentData,
    1,
  )

  return { ids: [id], errors: [], warnings: [] }
}

export async function importDocumentsZip(
  corpusId: string,
  zipBuffer: ArrayBuffer,
): Promise<{ ids: string[], errors: string[], warnings: string[] }> {
  const ids: string[] = []
  const errors: string[] = []
  const warnings: string[] = []

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(zipBuffer)
  } catch (error) {
    return { ids, errors: [`Not a valid ZIP archive: ${error}`], warnings }
  }

  let foundSupported = false
  const entries = Object.values(zip.files).filter(entry => !entry.dir)

  for (const entry of entries) {
    const kind = classifyDocumentFile(entry.name)
    if (!kind) {
      warnings.push(`Skipped unsupported file "${entry.name}".`)
      continue
    }

    foundSupported = true
    try {
      const content = await entry.async('string')
      const documentData = kind === 'text'
        ? buildTextDocumentData(entry.name, content)
        : buildTableDocumentData(entry.name, content)
      const id = await insertDocument(
        corpusId,
        documentData._source.identificationMetadata.title ?? entry.name,
        documentData,
        ids.length + 1,
      )
      ids.push(id)
    } catch (error) {
      errors.push(`Failed to import "${entry.name}": ${error}`)
    }
  }

  if (!foundSupported) {
    return {
      ids,
      errors: [`No supported files found in the archive. Supported extensions: ${DOCUMENT_FILE_EXTENSIONS.join(', ')}.`],
      warnings,
    }
  }

  return { ids, errors, warnings }
}
