export const NAMESPACES = {
  annotation: 'https://ecladatta.eurecom.fr/annotation/',
  at: 'https://ecladatta.eurecom.fr/ontology#',
  corpus: 'https://ecladatta.eurecom.fr/corpus/',
  csvw: 'http://www.w3.org/ns/csvw#',
  dcat: 'http://www.w3.org/ns/dcat#',
  dcterms: 'http://purl.org/dc/terms/',
  document: 'https://ecladatta.eurecom.fr/document/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  nif: 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/nif-core#',
  oa: 'http://www.w3.org/ns/oa#',
  pq: 'http://www.wikidata.org/prop/qualifier/',
  prov: 'http://www.w3.org/ns/prov#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  statement: 'https://ecladatta.eurecom.fr/statement/',
  wd: 'http://www.wikidata.org/entity/',
  wdt: 'http://www.wikidata.org/prop/direct/',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
} as const

export type Prefix = keyof typeof NAMESPACES

export const FULL_PREFIXES: Prefix[] = [
  'at',
  'corpus',
  'document',
  'annotation',
  'statement',
  'rdf',
  'rdfs',
  'xsd',
  'dcat',
  'dcterms',
  'foaf',
  'nif',
  'csvw',
  'oa',
  'prov',
  'wd',
  'wdt',
  'pq',
]

export const TRUTHY_PREFIXES: Prefix[] = [
  'rdf',
  'wd',
  'wdt',
  'pq',
  'xsd',
]
