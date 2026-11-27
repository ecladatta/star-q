export type DocumentFileKind = 'text' | 'table' | 'wikitext'

const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.html', '.htm']
const WIKITEXT_EXTENSIONS = ['.wikitext', '.wt', '.mediawiki', '.mw', '.wiki']
const TABLE_EXTENSIONS = ['.csv', '.tsv']

export const DOCUMENT_FILE_EXTENSIONS = [...TEXT_EXTENSIONS, ...WIKITEXT_EXTENSIONS, ...TABLE_EXTENSIONS]

export function fileExtension(fileName: string): string {
  const lastSegment = fileName.split('/').pop() ?? ''
  const dotIndex = lastSegment.lastIndexOf('.')
  return dotIndex >= 0 ? lastSegment.slice(dotIndex).toLowerCase() : ''
}

export function classifyDocumentFile(fileName: string): DocumentFileKind | null {
  const base = fileName.split('/').pop() ?? ''
  if (base.startsWith('._') || base === '.DS_Store') {
    return null
  }
  if (fileName.includes('/__MACOSX/')) {
    return null
  }

  const extension = fileExtension(fileName)
  if (TEXT_EXTENSIONS.includes(extension)) {
    return 'text'
  }
  if (WIKITEXT_EXTENSIONS.includes(extension)) {
    return 'wikitext'
  }
  if (TABLE_EXTENSIONS.includes(extension)) {
    return 'table'
  }
  return null
}
