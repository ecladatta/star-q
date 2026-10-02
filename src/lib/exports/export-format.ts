export type RdfExportMode = 'truthy' | 'full'

export type ExportKind = 'json' | 'rdf' | 'quickstatements'

export type ExportFormatConfig
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

export const EXPORT_FORMATS = {
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
} as const satisfies Record<string, ExportFormatConfig>

export type ExportFormat = keyof typeof EXPORT_FORMATS

export const EXPORT_FORMAT_IDS = Object.keys(
  EXPORT_FORMATS,
) as ExportFormat[]
