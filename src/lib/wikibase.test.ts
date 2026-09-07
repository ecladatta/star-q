import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  delete process.env.WIKIBASE_INSTANCE
  delete process.env.WIKIBASE_SPARQL_ENDPOINT
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('wikibase config', () => {
  it('defaults to Wikidata when env vars are unset', async () => {
    const { DEFAULT_WIKIBASE, WIKIBASE_RDF_NAMESPACES, wikibaseApiUrl, wikibaseWikiUrl } = await import('./wikibase')

    expect(DEFAULT_WIKIBASE).toEqual({
      instance: 'https://www.wikidata.org',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
    })
    expect(wikibaseApiUrl()).toBe('https://www.wikidata.org/w/api.php')
    expect(wikibaseWikiUrl('Q1')).toBe('https://www.wikidata.org/wiki/Q1')
    expect(wikibaseWikiUrl('P31')).toBe('https://www.wikidata.org/wiki/Property:P31')
    expect(WIKIBASE_RDF_NAMESPACES).toEqual({
      wd: 'https://www.wikidata.org/entity/',
      wdt: 'https://www.wikidata.org/prop/direct/',
      pq: 'https://www.wikidata.org/prop/qualifier/',
    })
  })

  it('derives every value from the env overrides', async () => {
    vi.stubEnv('WIKIBASE_INSTANCE', 'https://wikibase.example')
    vi.stubEnv('WIKIBASE_SPARQL_ENDPOINT', 'https://wikibase.example/query/sparql')
    const { DEFAULT_WIKIBASE, WIKIBASE_RDF_NAMESPACES, wikibaseApiUrl, wikibaseWikiUrl } = await import('./wikibase')

    expect(DEFAULT_WIKIBASE).toEqual({
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
    })
    expect(wikibaseApiUrl()).toBe('https://wikibase.example/w/api.php')
    expect(wikibaseWikiUrl('Q1')).toBe('https://wikibase.example/wiki/Q1')
    expect(wikibaseWikiUrl('P31')).toBe('https://wikibase.example/wiki/Property:P31')
    expect(WIKIBASE_RDF_NAMESPACES).toEqual({
      wd: 'https://wikibase.example/entity/',
      wdt: 'https://wikibase.example/prop/direct/',
      pq: 'https://wikibase.example/prop/qualifier/',
    })
  })

  it('keeps the default instance when only the SPARQL endpoint is overridden', async () => {
    vi.stubEnv('WIKIBASE_SPARQL_ENDPOINT', 'https://wikibase.example/query/sparql')
    const { DEFAULT_WIKIBASE } = await import('./wikibase')

    expect(DEFAULT_WIKIBASE.instance).toBe('https://www.wikidata.org')
    expect(DEFAULT_WIKIBASE).toEqual({
      instance: 'https://www.wikidata.org',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
    })
  })

  it('keeps the default SPARQL endpoint when only the instance is overridden', async () => {
    vi.stubEnv('WIKIBASE_INSTANCE', 'https://wikibase.example')
    const { DEFAULT_WIKIBASE, WIKIBASE_RDF_NAMESPACES } = await import('./wikibase')

    expect(DEFAULT_WIKIBASE).toEqual({
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
    })
    expect(WIKIBASE_RDF_NAMESPACES.wd).toBe('https://wikibase.example/entity/')
  })

  it('prefixes property ids with Property: in wiki urls', async () => {
    const { wikibaseWikiUrl } = await import('./wikibase')

    expect(wikibaseWikiUrl('Q5')).toBe('https://www.wikidata.org/wiki/Q5')
    expect(wikibaseWikiUrl('P31')).toBe('https://www.wikidata.org/wiki/Property:P31')
    expect(wikibaseWikiUrl('Qx')).toBe('https://www.wikidata.org/wiki/Qx')
  })

  it('builds wiki urls from an explicit instance without reading env', async () => {
    const { wikiUrl } = await import('./wikibase')

    expect(wikiUrl('https://wikibase.example', 'Q1')).toBe('https://wikibase.example/wiki/Q1')
    expect(wikiUrl('https://wikibase.example', 'P31')).toBe('https://wikibase.example/wiki/Property:P31')
    expect(wikiUrl('https://wikibase.example', 'Qx')).toBe('https://wikibase.example/wiki/Qx')
  })
})

describe('resolveWikibase', () => {
  const entry = {
    instanceUrl: 'https://wikibase.example',
    sparqlEndpoint: 'https://wikibase.example/query/sparql',
    enabled: true,
  }
  const instanceId = '123e4567-e89b-12d3-a456-426614174000'

  it('resolves to the default when settings are undefined or null', async () => {
    const { DEFAULT_WIKIBASE, resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase(undefined, entry)).toEqual(DEFAULT_WIKIBASE)
    expect(resolveWikibase(null, entry)).toEqual(DEFAULT_WIKIBASE)
  })

  it('resolves to the default when the id is set but no registry entry exists', async () => {
    const { DEFAULT_WIKIBASE, resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, null)).toEqual(DEFAULT_WIKIBASE)
    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, undefined)).toEqual(DEFAULT_WIKIBASE)
  })

  it('resolves to the entry urls when the id and entry are both present', async () => {
    const { resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, entry)).toEqual({
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
    })
  })

  it('resolves to the default when the entry is disabled', async () => {
    const { DEFAULT_WIKIBASE, resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, { ...entry, enabled: false })).toEqual(DEFAULT_WIKIBASE)
  })

  it('resolves to the default when no id is selected even if an entry is given', async () => {
    const { DEFAULT_WIKIBASE, resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({}, entry)).toEqual(DEFAULT_WIKIBASE)
  })
})
