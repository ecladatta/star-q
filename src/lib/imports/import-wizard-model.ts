import type { CorpusImportFormat } from './import-format'
import { fileExtension } from './documentFileClassifier'

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

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.html', '.htm']
const WIKITEXT_EXTENSIONS = ['.wikitext', '.wt', '.mediawiki', '.mw', '.wiki']
const TABLE_EXTENSIONS = ['.csv', '.tsv']
const JSONL_EXTENSIONS = ['.jsonl']
const JSON_EXTENSIONS = ['.json']
const ZIP_EXTENSIONS = ['.zip']

const FORMAT_BY_EXTENSION: Record<string, CorpusImportFormat> = Object.fromEntries([
  ...TEXT_EXTENSIONS.map(extension => [extension, 'text'] as const),
  ...WIKITEXT_EXTENSIONS.map(extension => [extension, 'wikitext'] as const),
  ...TABLE_EXTENSIONS.map(extension => [extension, 'csv'] as const),
  ...JSONL_EXTENSIONS.map(extension => [extension, 'corpuswalker'] as const),
  ...JSON_EXTENSIONS.map(extension => [extension, 'labelstudio'] as const),
  ...ZIP_EXTENSIONS.map(extension => [extension, 'documents-zip'] as const),
])

export function formatForFileName(fileName: string): CorpusImportFormat | null {
  const base = fileName.split('/').pop() ?? ''
  if (base.startsWith('._') || base === '.DS_Store') {
    return null
  }
  return FORMAT_BY_EXTENSION[fileExtension(fileName)] ?? null
}

export function splitUrlList(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
}
