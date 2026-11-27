import { CORPUS_IMPORT_FORMATS } from './import-format'

export type DocumentFileKind = 'text' | 'csv' | 'wikitext'

const KIND_EXTENSIONS: Record<DocumentFileKind, string[]> = {
  text: CORPUS_IMPORT_FORMATS.text.extensions,
  csv: CORPUS_IMPORT_FORMATS.csv.extensions,
  wikitext: CORPUS_IMPORT_FORMATS.wikitext.extensions,
}

const KIND_BY_EXTENSION = new Map<string, DocumentFileKind>(
  Object.entries(KIND_EXTENSIONS).flatMap(([kind, extensions]) =>
    extensions.map(extension => [extension, kind as DocumentFileKind] as const),
  ),
)

export const DOCUMENT_FILE_EXTENSIONS = [...new Set(KIND_BY_EXTENSION.keys())]

export function fileExtension(fileName: string): string {
  const lastSegment = fileName.split('/').pop() ?? ''
  const dotIndex = lastSegment.lastIndexOf('.')
  return dotIndex >= 0 ? lastSegment.slice(dotIndex).toLowerCase() : ''
}

export function isMacosMetadataFile(fileName: string): boolean {
  const base = fileName.split('/').pop() ?? ''
  return base.startsWith('._') || base === '.DS_Store' || fileName.includes('/__MACOSX/')
}

export function classifyDocumentFile(fileName: string): DocumentFileKind | null {
  if (isMacosMetadataFile(fileName)) {
    return null
  }

  return KIND_BY_EXTENSION.get(fileExtension(fileName)) ?? null
}
