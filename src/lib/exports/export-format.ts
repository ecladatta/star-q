export type RdfExportMode = 'truthy' | 'full'

export const CORPUS_EXPORT_FORMATS = {
  'json': {
    extension: 'json',
    label: 'JSON',
    query: 'format=json',
    rdfMode: null,
  },
  'rdf-truthy': {
    extension: 'truthy.ttl',
    label: 'RDF 1.2 (Truthy)',
    query: 'format=rdf&mode=truthy',
    rdfMode: 'truthy',
  },
  'rdf-full': {
    extension: 'full.ttl',
    label: 'RDF 1.2 (Full)',
    query: 'format=rdf&mode=full',
    rdfMode: 'full',
  },
} as const satisfies Record<string, {
  extension: string
  label: string
  query: string
  rdfMode: RdfExportMode | null
}>

export type CorpusExportFormat = keyof typeof CORPUS_EXPORT_FORMATS

export const CORPUS_EXPORT_FORMAT_IDS = Object.keys(
  CORPUS_EXPORT_FORMATS,
) as CorpusExportFormat[]
