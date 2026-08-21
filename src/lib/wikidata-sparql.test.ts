import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyPredicateCandidatesViaWikidata,
  fetchEntityLabels,
  fetchItemsWithTypeData,
  fetchMembership,
  fetchPropertyConstraints,
  SPARQL_CONCURRENCY,
} from './wikidata-sparql'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function sparqlResponse(bindings: Array<Record<string, { value: string }>>) {
  return { results: { bindings } }
}

describe('wikidata sparql caching', () => {
  it('caches membership facts across calls', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => sparqlResponse([
        { item: { value: 'http://www.wikidata.org/entity/Q1' }, class: { value: 'http://www.wikidata.org/entity/Q5' } },
      ]),
    })

    const first = await fetchMembership([
      ['Q1', 'Q5', 'instance-or-subclass'],
      ['Q2', 'Q5', 'instance-or-subclass'],
    ])
    expect(first).toEqual(new Set(['Q1|Q5|instance-or-subclass']))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const second = await fetchMembership([
      ['Q1', 'Q5', 'instance-or-subclass'],
      ['Q2', 'Q5', 'instance-or-subclass'],
    ])
    expect(second).toEqual(new Set(['Q1|Q5|instance-or-subclass']))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('queries each relation separately and keeps the relation in results', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sparqlResponse([
          { item: { value: 'http://www.wikidata.org/entity/Q1' }, class: { value: 'http://www.wikidata.org/entity/Q5' } },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sparqlResponse([
          { item: { value: 'http://www.wikidata.org/entity/Q2' }, class: { value: 'http://www.wikidata.org/entity/Q9' } },
        ]),
      })

    const result = await fetchMembership([
      ['Q1', 'Q5', 'instance'],
      ['Q2', 'Q9', 'subclass'],
    ])

    expect(result).toEqual(new Set(['Q1|Q5|instance', 'Q2|Q9|subclass']))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('caches type-data presence across calls', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => sparqlResponse([
        { item: { value: 'http://www.wikidata.org/entity/Q1' } },
      ]),
    })

    const first = await fetchItemsWithTypeData(['Q1', 'Q2'])
    expect(first).toEqual(new Set(['Q1']))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const second = await fetchItemsWithTypeData(['Q1', 'Q2'])
    expect(second).toEqual(new Set(['Q1']))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('caches entity labels across calls', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        entities: {
          Q5: { labels: { en: { value: 'human' } } },
          Q9: { labels: { en: { value: 'woman' } } },
        },
      }),
    })

    const first = await fetchEntityLabels(['Q5', 'Q9'])
    expect(first).toEqual(new Map([['Q5', 'human'], ['Q9', 'woman']]))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const second = await fetchEntityLabels(['Q5', 'Q9'])
    expect(second).toEqual(new Map([['Q5', 'human'], ['Q9', 'woman']]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('fetchPropertyConstraints', () => {
  it('parses constraints for fetched properties and reports availability', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        entities: {
          P69: {
            claims: {
              P2302: [{
                mainsnak: { datavalue: { value: { id: 'Q21503250' } } },
                qualifiers: {
                  P2308: [{ datavalue: { value: { id: 'Q5' } } }],
                  P2309: [{ datavalue: { value: { id: 'Q21503252' } } }],
                },
              }],
            },
          },
        },
      }),
    })

    const result = await fetchPropertyConstraints(['P69'])

    expect(result.unavailable).toBe(false)
    expect(result.constraints.get('P69')).toEqual({
      domain: [{ class: 'Q5', relation: 'instance' }],
      range: [],
    })
  })

  it('marks the result unavailable when entity data cannot be fetched', async () => {
    fetchMock.mockResolvedValue({ ok: false })

    const result = await fetchPropertyConstraints(['P70'])

    expect(result.unavailable).toBe(true)
    expect(result.constraints.size).toBe(0)
  })

  it('marks the result unavailable when one of several chunks fails', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `P${1000 + i}`)
    const entities = Object.fromEntries(ids.slice(0, 50).map(id => [id, { claims: {} }]))
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entities }) })
      .mockResolvedValueOnce({ ok: false })

    const result = await fetchPropertyConstraints(ids)

    expect(result.unavailable).toBe(true)
    expect(result.constraints.size).toBe(50)
  })

  it('marks the result unavailable when the API returns an error body without entities', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ error: { code: 'rate-limited' } }) })

    const result = await fetchPropertyConstraints(['P71'])

    expect(result.unavailable).toBe(true)
    expect(result.constraints.size).toBe(0)
  })
})

describe('request timeouts', () => {
  it('passes an AbortSignal to every fetch so requests can be aborted', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => sparqlResponse([]) })

    await fetchMembership([['Q998877', 'Q998876', 'subclass']])
    await fetchEntityLabels(['P123456'])

    expect(fetchMock).toHaveBeenCalled()
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    }
  })
})

describe('bounded sparql concurrency', () => {
  it('parallelizes chunk queries without exceeding the concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    fetchMock.mockImplementation(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(resolve => setTimeout(resolve, 5))
      inFlight--
      return { ok: true, json: async () => sparqlResponse([]) }
    })

    const pairs = Array.from(
      { length: 1000 },
      (_, i) => [`Q${5000 + i}`, 'Q9999', 'instance'] as [string, string, 'instance'],
    )
    await fetchMembership(pairs)

    expect(maxInFlight).toBeGreaterThan(1)
    expect(maxInFlight).toBeLessThanOrEqual(SPARQL_CONCURRENCY)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})

describe('classifyPredicateCandidatesViaWikidata', () => {
  it('classifies candidate predicates against entity checks', async () => {
    fetchMock
      .mockResolvedValueOnce({ // fetchPropertyConstraints -> wbgetentities
        ok: true,
        json: async () => ({
          entities: {
            P100: {
              claims: {
                P2302: [{
                  mainsnak: { datavalue: { value: { id: 'Q21503250' } } },
                  qualifiers: {
                    P2308: [{ datavalue: { value: { id: 'Q7100' } } }],
                    P2309: [{ datavalue: { value: { id: 'Q21503252' } } }],
                  },
                }],
              },
            },
            P101: { claims: {} },
          },
        }),
      })
      .mockResolvedValueOnce({ // fetchMembership SPARQL
        ok: true,
        json: async () => sparqlResponse([
          { item: { value: 'http://www.wikidata.org/entity/Q7001' }, class: { value: 'http://www.wikidata.org/entity/Q7100' } },
        ]),
      })
      .mockResolvedValueOnce({ // fetchItemsWithTypeData SPARQL
        ok: true,
        json: async () => sparqlResponse([
          { item: { value: 'http://www.wikidata.org/entity/Q7001' } },
        ]),
      })

    const result = await classifyPredicateCandidatesViaWikidata(
      ['P100', 'P101'],
      [{ entityId: 'Q7001', side: 'domain' }],
    )

    expect(result).toEqual({ members: ['P100', 'P101'], unverifiable: [], filteredOut: [] })
  })

  it('filters out predicates whose domain excludes a typed entity', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entities: {
            P102: {
              claims: {
                P2302: [{
                  mainsnak: { datavalue: { value: { id: 'Q21503250' } } },
                  qualifiers: {
                    P2308: [{ datavalue: { value: { id: 'Q7200' } } }],
                    P2309: [{ datavalue: { value: { id: 'Q21503252' } } }],
                  },
                }],
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => sparqlResponse([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sparqlResponse([
          { item: { value: 'http://www.wikidata.org/entity/Q7001' } },
        ]),
      })

    const result = await classifyPredicateCandidatesViaWikidata(
      ['P102'],
      [{ entityId: 'Q7001', side: 'domain' }],
    )

    expect(result).toEqual({ members: [], unverifiable: [], filteredOut: [{ id: 'P102', sides: ['domain'] }] })
  })
})
