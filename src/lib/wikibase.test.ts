import { describe, expect, it } from 'vitest'

describe('wikibase config', () => {
  it('builds wiki urls from an explicit instance without reading env', async () => {
    const { wikiUrl } = await import('./wikibase')

    expect(wikiUrl('https://wikibase.example', 'Q1')).toBe('https://wikibase.example/wiki/Q1')
    expect(wikiUrl('https://wikibase.example', 'P31')).toBe('https://wikibase.example/wiki/Property:P31')
    expect(wikiUrl('https://wikibase.example', 'Qx')).toBeNull()
    expect(wikiUrl('https://wikibase.example', 'Paris')).toBeNull()
  })

  it('returns null for non-conforming ids instead of guessing the namespace', async () => {
    const { wikiUrl } = await import('./wikibase')

    expect(wikiUrl('https://wikibase.example', '')).toBeNull()
    expect(wikiUrl('https://wikibase.example', 'Q')).toBeNull()
    expect(wikiUrl('https://wikibase.example', 'Property:P31')).toBeNull()
  })

  it('strips all trailing slashes from registered urls', async () => {
    const { parseWikibaseInstanceInput } = await import('./wikibase')

    expect(parseWikibaseInstanceInput({
      label: 'Example',
      instanceUrl: 'https://wikibase.example/',
      sparqlEndpoint: 'https://wikibase.example/query/sparql/',
      conceptBaseUri: 'https://wikidata.example/',
    })).toEqual({
      label: 'Example',
      instanceUrl: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: 'https://wikidata.example',
    })
    expect(parseWikibaseInstanceInput({
      label: 'Example',
      instanceUrl: 'https://wikibase.example//',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: 'https://wikidata.example//',
    }).conceptBaseUri).toBe('https://wikidata.example')
  })

  it('derives the concept base uri from the instance url when absent or blank', async () => {
    const { parseWikibaseInstanceInput } = await import('./wikibase')

    expect(parseWikibaseInstanceInput({
      label: 'Example',
      instanceUrl: 'https://wikibase.example/',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
    }).conceptBaseUri).toBe('https://wikibase.example')
    expect(parseWikibaseInstanceInput({
      label: 'Example',
      instanceUrl: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: '   ',
    }).conceptBaseUri).toBe('https://wikibase.example')
  })

  it('canonicalizes an explicit concept base uri through the same derive rule', async () => {
    const { parseWikibaseInstanceInput } = await import('./wikibase')

    expect(parseWikibaseInstanceInput({
      label: 'Wikidata',
      instanceUrl: 'https://www.wikidata.org',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
      conceptBaseUri: 'https://www.wikidata.org',
    }).conceptBaseUri).toBe('http://www.wikidata.org')
    expect(parseWikibaseInstanceInput({
      label: 'FactGrid',
      instanceUrl: 'https://database.factgrid.de',
      sparqlEndpoint: 'https://database.factgrid.de/query/sparql',
      conceptBaseUri: 'https://concepts.factgrid.de',
    }).conceptBaseUri).toBe('https://concepts.factgrid.de')
  })

  it('rejects an invalid explicit concept base uri with the field name', async () => {
    const { parseWikibaseInstanceInput } = await import('./wikibase')

    expect(() => parseWikibaseInstanceInput({
      label: 'Example',
      instanceUrl: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: 'ftp://wikibase.example',
    })).toThrow(TypeError)
    expect(() => parseWikibaseInstanceInput({
      label: 'Example',
      instanceUrl: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: 'not a url',
    })).toThrow(/conceptBaseUri/)
  })

  it('derives the canonical http base for newly registered wikidata instances, matching the migration backfill', async () => {
    const { parseWikibaseInstanceInput } = await import('./wikibase')

    expect(parseWikibaseInstanceInput({
      label: 'Wikidata',
      instanceUrl: 'https://www.wikidata.org',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
    }).conceptBaseUri).toBe('http://www.wikidata.org')
    expect(parseWikibaseInstanceInput({
      label: 'Wikidata apex',
      instanceUrl: 'https://wikidata.org',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
    }).conceptBaseUri).toBe('http://wikidata.org')
    expect(parseWikibaseInstanceInput({
      label: 'Wikidata uppercase',
      instanceUrl: 'https://WWW.Wikidata.ORG',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
    }).conceptBaseUri).toBe('http://WWW.Wikidata.ORG')
    expect(parseWikibaseInstanceInput({
      label: 'Wikidata with default port',
      instanceUrl: 'https://wikidata.org:443',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
    }).conceptBaseUri).toBe('http://wikidata.org:443')
    expect(parseWikibaseInstanceInput({
      label: 'Not wikidata subdomain',
      instanceUrl: 'https://subdomain.wikidata.org',
      sparqlEndpoint: 'https://query.wikidata.org/sparql',
    }).conceptBaseUri).toBe('https://subdomain.wikidata.org')
  })
})

describe('wikibaseRdfNamespaces', () => {
  it('joins the stored concept base into namespace IRIs', async () => {
    const { asConceptBaseUri, wikibaseRdfNamespaces } = await import('./wikibase')

    expect(wikibaseRdfNamespaces(asConceptBaseUri('https://database.factgrid.de'))).toEqual({
      wd: 'https://database.factgrid.de/entity/',
      wdt: 'https://database.factgrid.de/prop/direct/',
      pq: 'https://database.factgrid.de/prop/qualifier/',
    })
  })

  it('emits canonical http IRIs from the migrated Wikidata base without host sniffing', async () => {
    const { asConceptBaseUri, wikibaseRdfNamespaces } = await import('./wikibase')

    expect(wikibaseRdfNamespaces(asConceptBaseUri('http://www.wikidata.org'))).toEqual({
      wd: 'http://www.wikidata.org/entity/',
      wdt: 'http://www.wikidata.org/prop/direct/',
      pq: 'http://www.wikidata.org/prop/qualifier/',
    })
  })
})

describe('resolveWikibase', () => {
  const entry = {
    label: 'Example',
    instanceUrl: 'https://wikibase.example',
    sparqlEndpoint: 'https://wikibase.example/query/sparql',
    conceptBaseUri: 'https://wikibase.example',
    enabled: true,
  }
  const instanceId = '123e4567-e89b-12d3-a456-426614174000'

  it('returns the entry urls when the id and an enabled entry are both present', async () => {
    const { resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, entry)).toEqual({
      label: 'Example',
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: 'https://wikibase.example',
    })
  })

  it('returns null when the id is the none sentinel even if an entry is given', async () => {
    const { resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: 'none' }, entry)).toBeNull()
  })

  it('returns null when the entry is disabled', async () => {
    const { resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, { ...entry, enabled: false })).toBeNull()
  })

  it('returns null when no registry entry exists', async () => {
    const { resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, null)).toBeNull()
    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, undefined)).toBeNull()
  })

  it('returns null when no id is selected even if an entry is given', async () => {
    const { resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({}, entry)).toBeNull()
    expect(resolveWikibase(undefined, entry)).toBeNull()
    expect(resolveWikibase(null, entry)).toBeNull()
  })
})
