export type CorpusImportFormat
  = | 'full-corpus-export'
    | 'corpuswalker'
    | 'labelstudio'
    | 'irit-zip'
    | 'text'

export type CorpusImportFormatConfig = {
  label: string
  extensions: string[]
}

export const CORPUS_IMPORT_FORMATS: Record<CorpusImportFormat, CorpusImportFormatConfig> = {
  'full-corpus-export': {
    label: 'STAR-Q export',
    extensions: ['.json'],
  },
  'corpuswalker': {
    label: 'Corpus Walker',
    extensions: ['.jsonl', '.json'],
  },
  'labelstudio': {
    label: 'Label Studio',
    extensions: ['.json'],
  },
  'irit-zip': {
    label: 'IRIT archive',
    extensions: ['.zip'],
  },
  'text': {
    label: 'Text / Markdown / HTML',
    extensions: ['.txt', '.md', '.markdown', '.html', '.htm'],
  },
}

export type CorpusImportFormatId = keyof typeof CORPUS_IMPORT_FORMATS

export const CORPUS_IMPORT_FORMAT_IDS = Object.keys(
  CORPUS_IMPORT_FORMATS,
) as CorpusImportFormat[]

export function isCorpusImportFormat(value: unknown): value is CorpusImportFormat {
  return typeof value === 'string' && value in CORPUS_IMPORT_FORMATS
}

export function importFormatLabel(format: CorpusImportFormat): string {
  const config = CORPUS_IMPORT_FORMATS[format]
  return `${config.label} (${config.extensions.join(', ')})`
}

export function importFormatAccept(format: CorpusImportFormat): string {
  return CORPUS_IMPORT_FORMATS[format].extensions.join(',')
}
