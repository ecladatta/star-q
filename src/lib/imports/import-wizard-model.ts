import type { CorpusImportFormat } from './import-format'
import { classifyDocumentFile, fileExtension, isMacosMetadataFile } from './documentFileClassifier'
import { DEFAULT_FORMAT_BY_EXTENSION } from './import-format'

export type SourceId
  = | 'web-pages'
    | 'files'
    | 'corpuswalker'
    | 'labelstudio'
    | 'irit-zip'
    | 'full-corpus-export'

export type ImportItemStatus = 'queued' | 'importing' | 'imported' | 'error'

type ImportItemFields = {
  id: string
  label: string
  status: ImportItemStatus
  count?: number
  message?: string
}

export type UrlImportItem = ImportItemFields & { kind: 'url' }

export type FileImportItem = ImportItemFields & {
  kind: 'file'
  file: File
  format: CorpusImportFormat
}

export type ImportItem = UrlImportItem | FileImportItem

export type ImportItemOutcome = {
  status: 'imported' | 'error'
  count?: number
  message?: string
}

export function formatForFileName(fileName: string): CorpusImportFormat | null {
  if (isMacosMetadataFile(fileName)) {
    return null
  }
  const kind = classifyDocumentFile(fileName)
  if (kind !== null) {
    return kind
  }
  return DEFAULT_FORMAT_BY_EXTENSION[fileExtension(fileName)] ?? null
}

export function splitUrlList(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
}
