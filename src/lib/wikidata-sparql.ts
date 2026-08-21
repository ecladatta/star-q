import type {
  CandidateMembership,
  ConstraintEntityCheck,
  ConstraintRelation,
  ConstraintSide,
  EntityCandidateClassification,
  MembershipTriple,
  PropertyConstraints,
  WikidataClaims,
} from './wikidata-constraints'
import WBK from 'wikibase-sdk'
import {
  classifyCandidates,
  collectPairs,
  membershipKey,
  parsePropertyConstraints,
  WIKIDATA_ITEM_PATTERN,
  WIKIDATA_PROPERTY_PATTERN,
} from './wikidata-constraints'

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'annotation-tool/0.2.0 (https://github.com/ecladatta/annotation-tool)'

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: SPARQL_ENDPOINT,
})

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 10_000

export async function withRequestTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await run(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, { value: T, expiresAt: number }>()
  return {
    has(key: string): boolean {
      const entry = store.get(key)
      if (!entry)
        return false
      if (entry.expiresAt > Date.now())
        return true
      store.delete(key)
      return false
    },
    get(key: string): T | undefined {
      const entry = store.get(key)
      if (entry && entry.expiresAt > Date.now())
        return entry.value
      if (entry)
        store.delete(key)
      return undefined
    },
    set(key: string, value: T): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
  }
}

const propertyConstraintsCache = createTtlCache<PropertyConstraints>(CACHE_TTL_MS)
const membershipCache = createTtlCache<boolean>(CACHE_TTL_MS)
const typeDataCache = createTtlCache<boolean>(CACHE_TTL_MS)
const labelsCache = createTtlCache<string | null>(CACHE_TTL_MS)

type WbEntityIds = Parameters<typeof wdk.getManyEntities>[0]['ids']

type WbGetEntitiesResponse = {
  entities?: Record<string, {
    claims?: WikidataClaims
    labels?: Record<string, { value?: string }>
  }>
}

function fetchJson(url: string): Promise<WbGetEntitiesResponse | null> {
  return withRequestTimeout(signal =>
    fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal })
      .then(res => res.json()),
  ).catch(() => null)
}

function entityIdFromValue(value: string): string | null {
  const match = /entity\/([QP]\d+)$/.exec(value)
  return match ? match[1] : null
}

async function runSparql(query: string): Promise<Array<Record<string, { value: string }>>> {
  return withRequestTimeout(async (signal) => {
    const response = await fetch(SPARQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({ query }).toString(),
      signal,
    })
    if (!response.ok) {
      throw new Error(`Wikidata SPARQL request failed: ${response.status}`)
    }
    const data = await response.json()
    return data.results?.bindings ?? []
  })
}

const SPARQL_CHUNK_SIZE = 200

export const SPARQL_CONCURRENCY = 3

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) {
        return
      }
      results[index] = await fn(items[index])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

const RELATION_QUERY: Record<ConstraintRelation, string> = {
  'instance': '{ ?item wdt:P31/wdt:P279* ?class }',
  'subclass': '{ ?item wdt:P279* ?class }',
  'instance-or-subclass': '{ ?item wdt:P31/wdt:P279* ?class } UNION { ?item wdt:P279* ?class }',
}

export async function fetchMembership(pairs: MembershipTriple[]): Promise<Set<string>> {
  const members = new Set<string>()

  const byRelation = new Map<ConstraintRelation, Array<[string, string]>>()
  for (const [item, cls, relation] of pairs) {
    const key = membershipKey(item, cls, relation)
    const cached = membershipCache.get(key)
    if (cached === true) {
      members.add(key)
    } else if (cached === undefined) {
      const group = byRelation.get(relation) ?? []
      group.push([item, cls])
      byRelation.set(relation, group)
    }
  }

  const queries: Array<{ relation: ConstraintRelation, chunk: Array<[string, string]> }> = []
  for (const [relation, group] of byRelation) {
    for (let index = 0; index < group.length; index += SPARQL_CHUNK_SIZE) {
      queries.push({ relation, chunk: group.slice(index, index + SPARQL_CHUNK_SIZE) })
    }
  }

  const bindingsByQuery = await mapWithConcurrency(queries, SPARQL_CONCURRENCY, ({ relation, chunk }) => {
    const values = chunk.map(([item, cls]) => `(wd:${item} wd:${cls})`).join(' ')
    const query = [
      'SELECT DISTINCT ?item ?class WHERE {',
      `VALUES (?item ?class) { ${values} }`,
      RELATION_QUERY[relation],
      '}',
    ].join(' ')
    return runSparql(query)
  })

  for (let index = 0; index < queries.length; index++) {
    const { relation, chunk } = queries[index]
    for (const binding of bindingsByQuery[index]) {
      const item = entityIdFromValue(binding.item.value)
      const cls = entityIdFromValue(binding.class.value)
      if (item && cls) {
        const key = membershipKey(item, cls, relation)
        members.add(key)
        membershipCache.set(key, true)
      }
    }
    for (const [item, cls] of chunk) {
      const key = membershipKey(item, cls, relation)
      membershipCache.set(key, members.has(key))
    }
  }

  return members
}

export async function fetchItemsWithTypeData(items: string[]): Promise<Set<string>> {
  const typed = new Set<string>()

  const missing: string[] = []
  for (const id of items) {
    const cached = typeDataCache.get(id)
    if (cached === true) {
      typed.add(id)
    } else if (cached === undefined) {
      missing.push(id)
    }
  }

  if (missing.length === 0) {
    return typed
  }

  const chunks: string[][] = []
  for (let index = 0; index < missing.length; index += SPARQL_CHUNK_SIZE) {
    chunks.push(missing.slice(index, index + SPARQL_CHUNK_SIZE))
  }

  const bindingsByChunk = await mapWithConcurrency(chunks, SPARQL_CONCURRENCY, (chunk) => {
    const values = chunk.map(id => `wd:${id}`).join(' ')
    const query = [
      'SELECT DISTINCT ?item WHERE {',
      `VALUES ?item { ${values} }`,
      '{ ?item wdt:P31 ?x }',
      'UNION',
      '{ ?item wdt:P279 ?x }',
      '}',
    ].join(' ')
    return runSparql(query)
  })

  for (let index = 0; index < chunks.length; index++) {
    for (const binding of bindingsByChunk[index]) {
      const id = entityIdFromValue(binding.item.value)
      if (id) {
        typed.add(id)
      }
    }
    for (const id of chunks[index]) {
      typeDataCache.set(id, typed.has(id))
    }
  }

  return typed
}

export type PropertyConstraintsResult = {
  constraints: Map<string, PropertyConstraints>
  unavailable: boolean
}

export async function fetchPropertyConstraints(propertyIds: string[]): Promise<PropertyConstraintsResult> {
  const constraints = new Map<string, PropertyConstraints>()
  const uncached: string[] = []
  let unavailable = false

  for (const id of propertyIds) {
    if (!WIKIDATA_PROPERTY_PATTERN.test(id)) {
      continue
    }
    const cached = propertyConstraintsCache.get(id)
    if (cached) {
      constraints.set(id, cached)
    } else {
      uncached.push(id)
    }
  }

  if (uncached.length > 0) {
    const urls = wdk.getManyEntities({ ids: uncached as unknown as WbEntityIds, props: 'claims', format: 'json' })
    const responses = await mapWithConcurrency(urls, SPARQL_CONCURRENCY, url => fetchJson(url))
    for (const data of responses) {
      if (!data?.entities) {
        unavailable = true
        continue
      }
      for (const [id, entity] of Object.entries(data.entities)) {
        if (!WIKIDATA_PROPERTY_PATTERN.test(id)) {
          continue
        }
        const parsed = parsePropertyConstraints(entity.claims)
        propertyConstraintsCache.set(id, parsed)
        constraints.set(id, parsed)
      }
    }
  }

  return { constraints, unavailable }
}

export async function fetchEntityLabels(ids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>()
  const validIds = ids.filter(id =>
    WIKIDATA_ITEM_PATTERN.test(id) || WIKIDATA_PROPERTY_PATTERN.test(id))

  const missing: string[] = []
  for (const id of validIds) {
    if (labelsCache.has(id)) {
      const cached = labelsCache.get(id)
      if (cached != null) {
        labels.set(id, cached)
      }
    } else {
      missing.push(id)
    }
  }

  if (missing.length === 0) {
    return labels
  }

  const urls = wdk.getManyEntities({ ids: missing as unknown as WbEntityIds, languages: 'en', props: 'labels', format: 'json' })
  const responses = await mapWithConcurrency(urls, SPARQL_CONCURRENCY, url => fetchJson(url))
  for (const data of responses) {
    if (!data?.entities) {
      continue
    }
    for (const [id, entity] of Object.entries(data.entities)) {
      const label = entity.labels?.en?.value
      labelsCache.set(id, label ?? null)
      if (label) {
        labels.set(id, label)
      }
    }
  }

  return labels
}

export async function classifyEntityCandidatesViaWikidata(
  candidates: string[],
  constraints: PropertyConstraints,
  side: ConstraintSide,
): Promise<EntityCandidateClassification> {
  const memberships: CandidateMembership[] = candidates.map(candidate => ({
    candidate,
    subjects: [{ item: candidate, side, classes: constraints[side] }],
  }))
  const pairs = collectPairs(memberships.flatMap(membership => membership.subjects))
  const [memberPairs, itemsWithTypeData] = await Promise.all([
    fetchMembership(pairs),
    fetchItemsWithTypeData(candidates),
  ])
  return classifyCandidates(memberships, memberPairs, itemsWithTypeData)
}

export async function classifyPredicateCandidatesViaWikidata(
  candidates: string[],
  checks: ConstraintEntityCheck[],
): Promise<EntityCandidateClassification> {
  const { constraints } = await fetchPropertyConstraints(candidates)
  const memberships: CandidateMembership[] = candidates.map(candidate => ({
    candidate,
    subjects: checks.map(check => ({
      item: check.entityId,
      side: check.side,
      classes: constraints.get(candidate)?.[check.side] ?? [],
    })),
  }))
  const pairs = collectPairs(memberships.flatMap(membership => membership.subjects))
  const [memberPairs, itemsWithTypeData] = await Promise.all([
    fetchMembership(pairs),
    fetchItemsWithTypeData(checks.map(check => check.entityId)),
  ])
  return classifyCandidates(memberships, memberPairs, itemsWithTypeData)
}
