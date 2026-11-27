'use server'
import type { UrlImportFormat } from './urlImportDetection'
import type { FetchedResource } from './urlPageFetch'
import type { DocumentData } from '@/types/types'
import JSZip from 'jszip'
import { db } from '@/db/drizzle'
import { document } from '@/db/schema'
import { metadataColumnsFromDocumentData } from '@/lib/document-metadata'
import { importCorpuswalkerDocuments } from './corpuswalkerImport'
import { buildTableDocumentData } from './csvDocumentData'
import { classifyDocumentFile, DOCUMENT_FILE_EXTENSIONS } from './documentFileClassifier'
import { importFullCorpusExportDocuments } from './fullCorpusImport'
import { importLabelStudioDocuments } from './labelstudioImport'
import { buildTextDocumentData, buildUrlDocumentData } from './textDocumentData'
import { detectUrlImportFormat, isHtmlMediaType, URL_MEDIA_TYPES } from './urlImportDetection'
import { fetchResourceFromUrl } from './urlPageFetch'
import { buildWikitextDocumentData } from './wikitextDocumentData'

export type ImporterResult = {
  ids: string[]
  errors: string[]
  warnings: string[]
}

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
    ...metadataColumnsFromDocumentData(raw),
  }).returning({ id: document.id })

  return inserted.id
}

export async function importTextDocument(
  corpusId: string,
  fileName: string,
  content: string,
): Promise<ImporterResult> {
  const { data: documentData, warnings } = await buildTextDocumentData(fileName, content)
  const id = await insertDocument(
    corpusId,
    documentData._source.identificationMetadata.title ?? fileName,
    documentData,
    1,
  )

  return { ids: [id], errors: [], warnings }
}

export async function importWikitextDocument(
  corpusId: string,
  fileName: string,
  content: string,
): Promise<ImporterResult> {
  const documentData = buildWikitextDocumentData(fileName, content)
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
): Promise<ImporterResult> {
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
): Promise<ImporterResult> {
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
      let documentData: DocumentData
      if (kind === 'text') {
        const { data, warnings: documentWarnings } = await buildTextDocumentData(entry.name, content)
        documentData = data
        warnings.push(...documentWarnings)
      } else if (kind === 'wikitext') {
        documentData = buildWikitextDocumentData(entry.name, content)
      } else {
        documentData = buildTableDocumentData(entry.name, content)
      }
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

export async function importUrlDocument(corpusId: string, url: string): Promise<ImporterResult> {
  let resource: FetchedResource
  try {
    resource = await fetchResourceFromUrl(url, { acceptedMediaTypes: URL_MEDIA_TYPES, wikiFallback: true })
  } catch (error) {
    return { ids: [], errors: [error instanceof Error ? error.message : String(error)], warnings: [] }
  }

  let format: UrlImportFormat
  try {
    format = detectUrlImportFormat(resource.mediaType, resource.url, resource.text)
  } catch (error) {
    return { ids: [], errors: [error instanceof Error ? error.message : String(error)], warnings: [] }
  }

  switch (format) {
    case 'text': {
      const { data, warnings } = await buildUrlDocumentData(resource.url, resource.text, isHtmlMediaType(resource.mediaType), new Date().toISOString())
      const id = await insertDocument(
        corpusId,
        data._source.identificationMetadata.title ?? url,
        data,
        1,
      )
      return { ids: [id], errors: [], warnings }
    }
    case 'csv':
      return importCsvDocument(corpusId, resource.url, resource.text)
    case 'wikitext':
      return importWikitextDocument(corpusId, resource.url, resource.text)
    case 'labelstudio':
      return importLabelStudioDocuments(corpusId, resource.text)
    case 'corpuswalker':
      return importCorpuswalkerDocuments(corpusId, resource.text)
    case 'full-corpus-export': {
      let parsed: unknown
      try {
        parsed = JSON.parse(resource.text)
      } catch {
        return { ids: [], errors: ['Failed to parse the JSON file.'], warnings: [] }
      }
      return importFullCorpusExportDocuments(corpusId, parsed)
    }
  }
}
