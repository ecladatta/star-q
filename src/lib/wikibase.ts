export const WIKIBASE = {
  instance: process.env.WIKIBASE_INSTANCE || 'https://www.wikidata.org',
  sparqlEndpoint: process.env.WIKIBASE_SPARQL_ENDPOINT || 'https://query.wikidata.org/sparql',
}

export function wikibaseApiUrl(): string {
  return `${WIKIBASE.instance}/w/api.php`
}

export function wikiUrl(instance: string, id: string): string {
  const prefix = id.startsWith('P') ? 'Property:' : ''
  return `${instance}/wiki/${prefix}${id}`
}

export function wikibaseWikiUrl(id: string): string {
  return wikiUrl(WIKIBASE.instance, id)
}

export const WIKIBASE_RDF_NAMESPACES = {
  wd: `${WIKIBASE.instance}/entity/`,
  wdt: `${WIKIBASE.instance}/prop/direct/`,
  pq: `${WIKIBASE.instance}/prop/qualifier/`,
}
