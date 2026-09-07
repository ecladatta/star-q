import type { CorpusSettings } from './corpus-settings'
import type { WikibaseInstance } from '@/db/schema'
import { WIKIBASE_INSTANCE_NONE } from './corpus-settings'

export type WikibaseConfig = {
  instance: string
  sparqlEndpoint: string
}

export type ResolvedWikibase = WikibaseConfig & { label: string }

export function resolveWikibase(
  settings: CorpusSettings | undefined | null,
  entry: Pick<WikibaseInstance, 'label' | 'instanceUrl' | 'sparqlEndpoint' | 'enabled'> | null | undefined,
): ResolvedWikibase | null {
  if (settings?.wikibaseInstanceId === WIKIBASE_INSTANCE_NONE) {
    return null
  }
  if (settings?.wikibaseInstanceId && entry?.enabled) {
    return { label: entry.label, instance: entry.instanceUrl, sparqlEndpoint: entry.sparqlEndpoint }
  }
  return null
}

export type WikibaseInstanceInput = {
  label: string
  instanceUrl: string
  sparqlEndpoint: string
}

const MAX_INSTANCE_LABEL_LENGTH = 120
const MAX_INSTANCE_URL_LENGTH = 2000

function parseInstanceUrl(raw: string, field: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError(`Invalid Wikibase instance "${field}": expected a non-empty URL string`)
  }
  const value = raw.trim()
  if (value.length === 0) {
    throw new TypeError(`Invalid Wikibase instance "${field}": expected a non-empty URL string`)
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new TypeError(`Invalid Wikibase instance "${field}": expected an absolute URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError(`Invalid Wikibase instance "${field}": protocol must be http or https`)
  }
  if (url.username || url.password) {
    throw new TypeError(`Invalid Wikibase instance "${field}": credentials in the URL are not allowed`)
  }
  if (value.length > MAX_INSTANCE_URL_LENGTH) {
    throw new TypeError(`Invalid Wikibase instance "${field}": must be at most ${MAX_INSTANCE_URL_LENGTH} characters`)
  }
  return value
}

export function parseWikibaseInstanceInput(input: WikibaseInstanceInput): WikibaseInstanceInput {
  if (typeof input?.label !== 'string' || typeof input?.instanceUrl !== 'string' || typeof input?.sparqlEndpoint !== 'string') {
    throw new TypeError('Invalid Wikibase instance input: label, instanceUrl and sparqlEndpoint are required strings')
  }
  const label = input.label.trim()
  if (label.length === 0 || label.length > MAX_INSTANCE_LABEL_LENGTH) {
    throw new TypeError(`Invalid Wikibase instance "label": must be between 1 and ${MAX_INSTANCE_LABEL_LENGTH} characters`)
  }
  return {
    label,
    instanceUrl: parseInstanceUrl(input.instanceUrl, 'instanceUrl'),
    sparqlEndpoint: parseInstanceUrl(input.sparqlEndpoint, 'sparqlEndpoint'),
  }
}

export function wikiUrl(instance: string, id: string): string {
  const prefix = id.startsWith('P') ? 'Property:' : ''
  return `${instance}/wiki/${prefix}${id}`
}

export type WikibaseRdfNamespaces = {
  wd: string
  wdt: string
  pq: string
}

export function wikibaseRdfNamespaces(instance: string): WikibaseRdfNamespaces {
  return {
    wd: `${instance}/entity/`,
    wdt: `${instance}/prop/direct/`,
    pq: `${instance}/prop/qualifier/`,
  }
}
