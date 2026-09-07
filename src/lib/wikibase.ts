import type { CorpusSettings } from './corpus-settings'
import type { WikibaseInstance } from '@/db/schema'

export type WikibaseConfig = {
  instance: string
  sparqlEndpoint: string
}

export const DEFAULT_WIKIBASE: WikibaseConfig = {
  instance: process.env.WIKIBASE_INSTANCE || 'https://www.wikidata.org',
  sparqlEndpoint: process.env.WIKIBASE_SPARQL_ENDPOINT || 'https://query.wikidata.org/sparql',
}

export function resolveWikibase(
  settings: CorpusSettings | undefined | null,
  entry: Pick<WikibaseInstance, 'instanceUrl' | 'sparqlEndpoint'> | null | undefined,
): WikibaseConfig {
  if (settings?.wikibaseInstanceId && entry) {
    return { instance: entry.instanceUrl, sparqlEndpoint: entry.sparqlEndpoint }
  }
  return DEFAULT_WIKIBASE
}

export function wikibaseApiUrl(): string {
  return `${DEFAULT_WIKIBASE.instance}/w/api.php`
}

export function wikiUrl(instance: string, id: string): string {
  const prefix = id.startsWith('P') ? 'Property:' : ''
  return `${instance}/wiki/${prefix}${id}`
}

export function wikibaseWikiUrl(id: string): string {
  return wikiUrl(DEFAULT_WIKIBASE.instance, id)
}

export const WIKIBASE_RDF_NAMESPACES = {
  wd: `${DEFAULT_WIKIBASE.instance}/entity/`,
  wdt: `${DEFAULT_WIKIBASE.instance}/prop/direct/`,
  pq: `${DEFAULT_WIKIBASE.instance}/prop/qualifier/`,
}
