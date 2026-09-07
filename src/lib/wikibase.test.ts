import { describe, expect, it } from 'vitest'

describe('wikibase config', () => {
  it('builds wiki urls from an explicit instance without reading env', async () => {
    const { wikiUrl } = await import('./wikibase')

    expect(wikiUrl('https://wikibase.example', 'Q1')).toBe('https://wikibase.example/wiki/Q1')
    expect(wikiUrl('https://wikibase.example', 'P31')).toBe('https://wikibase.example/wiki/Property:P31')
    expect(wikiUrl('https://wikibase.example', 'Qx')).toBe('https://wikibase.example/wiki/Qx')
  })
})

describe('resolveWikibase', () => {
  const entry = {
    label: 'Example',
    instanceUrl: 'https://wikibase.example',
    sparqlEndpoint: 'https://wikibase.example/query/sparql',
    enabled: true,
  }
  const instanceId = '123e4567-e89b-12d3-a456-426614174000'

  it('returns the entry urls when the id and an enabled entry are both present', async () => {
    const { resolveWikibase } = await import('./wikibase')

    expect(resolveWikibase({ wikibaseInstanceId: instanceId }, entry)).toEqual({
      label: 'Example',
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
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
