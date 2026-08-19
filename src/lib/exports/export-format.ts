export type RdfExportMode = 'truthy' | 'full'

export type CorpusExportKind = 'json' | 'rdf' | 'quickstatements'

export type CorpusExportFormatConfig
  = | {
    kind: 'json'
    extension: string
    label: string
    query: string
  }
  | {
    kind: 'rdf'
    extension: string
    label: string
    query: string
    rdfMode: RdfExportMode
  }
  | {
    kind: 'quickstatements'
    extension: string
    label: string
    query: string
  }

export const CORPUS_EXPORT_FORMATS = {
  'json': {
    extension: 'json',
    label: 'JSON',
    query: 'format=json',
    kind: 'json',
  },
  'rdf-truthy': {
    extension: 'truthy.ttl',
    label: 'RDF 1.2 (Truthy)',
    query: 'format=rdf&mode=truthy',
    kind: 'rdf',
    rdfMode: 'truthy',
  },
  'rdf-full': {
    extension: 'full.ttl',
    label: 'RDF 1.2 (Full)',
    query: 'format=rdf&mode=full',
    kind: 'rdf',
    rdfMode: 'full',
  },
  'quickstatements': {
    extension: 'qs',
    label: 'QuickStatements 3.0',
    query: 'format=quickstatements',
    kind: 'quickstatements',
  },
} as const satisfies Record<string, CorpusExportFormatConfig>

export type CorpusExportFormat = keyof typeof CORPUS_EXPORT_FORMATS

export const CORPUS_EXPORT_FORMAT_IDS = Object.keys(
  CORPUS_EXPORT_FORMATS,
) as CorpusExportFormat[]
