import { fileExtension } from './documentFileClassifier'
import { isFullCorpusExport } from './fullCorpusExport'

export const URL_MEDIA_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain', 'text/csv', 'application/json']

export type UrlImportFormat
  = | 'text'
    | 'csv'
    | 'wikitext'
    | 'labelstudio'
    | 'corpuswalker'
    | 'full-corpus-export'

export function isHtmlMediaType(mediaType: string): boolean {
  return mediaType === '' || mediaType === 'text/html' || mediaType === 'application/xhtml+xml'
}

export function detectUrlImportFormat(mediaType: string, url: string, text: string): UrlImportFormat {
  if (isHtmlMediaType(mediaType)) {
    return 'text'
  }
  if (mediaType === 'text/csv') {
    return 'csv'
  }
  if (mediaType === 'application/json' || mediaType === 'text/plain') {
    const parsed = parseJson(text)
    if (parsed !== undefined) {
      return detectJsonShape(parsed)
    }
    if (startsAsCorpuswalkerJsonl(text)) {
      return 'corpuswalker'
    }
    if (mediaType === 'text/plain') {
      return detectPlainTextByExtension(url)
    }
    throw new Error('The URL did not return a recognized JSON format.')
  }
  throw new Error(`The URL returned content type "${mediaType}", which is not supported.`)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function detectJsonShape(parsed: unknown): UrlImportFormat {
  if (isFullCorpusExport(parsed)) {
    return 'full-corpus-export'
  }
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
    const first = parsed[0] as Record<string, unknown>
    if (typeof first.data === 'object' && first.data !== null) {
      return 'labelstudio'
    }
  }
  throw new Error('The URL did not return a recognized JSON format.')
}

function startsAsCorpuswalkerJsonl(text: string): boolean {
  const first = text.split('\n').find(line => line.trim() !== '')
  if (first === undefined) {
    return false
  }
  const parsed = parseJson(first)
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && '_index' in parsed
}

function detectPlainTextByExtension(url: string): UrlImportFormat {
  const extension = fileExtension(url)
  if (extension === '.csv' || extension === '.tsv') {
    return 'csv'
  }
  if (extension === '.wikitext' || extension === '.wt' || extension === '.mediawiki' || extension === '.mw' || extension === '.wiki') {
    return 'wikitext'
  }
  return 'text'
}
