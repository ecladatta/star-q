import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { probeWikibaseInstance } from './wikibase-probe'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function probe(input?: Partial<{ instanceUrl: string, sparqlEndpoint: string }>) {
  return probeWikibaseInstance({
    instanceUrl: 'https://wikibase.example/',
    sparqlEndpoint: 'https://wikibase.example/query/sparql',
    ...input,
  })
}

describe('probeWikibaseInstance', () => {
  it('reports success when both endpoints respond correctly', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ searchinfo: { search: 'test' }, search: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: { bindings: [] } }) })

    const result = await probe()

    expect(result).toEqual({ instanceApi: { ok: true }, sparql: { ok: true } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://wikibase.example/w/api.php?action=wbsearchentities&format=json&search=test&language=en&limit=1&type=item')
    expect(fetchMock.mock.calls[1][0]).toBe('https://wikibase.example/query/sparql')
    expect(fetchMock.mock.calls[1][1].method).toBe('POST')
  })

  it('reports a failed instance API check', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: { bindings: [] } }) })

    const result = await probe()

    expect(result.instanceApi).toEqual({ ok: false, error: 'Instance API returned HTTP 404' })
    expect(result.sparql.ok).toBe(true)
  })

  it('rejects a non-Wikibase API response', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { code: 'unknown_action' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: { bindings: [] } }) })

    const result = await probe()

    expect(result.instanceApi).toEqual({ ok: false, error: 'Endpoint does not look like a Wikibase API' })
  })

  it('rejects an entity response without a search key', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: { bindings: [] } }) })

    const result = await probe()

    expect(result.instanceApi).toEqual({ ok: false, error: 'Endpoint does not look like a Wikibase API' })
  })

  it('rejects invalid URLs without fetching', async () => {
    const result = await probe({ instanceUrl: 'not-a-url', sparqlEndpoint: 'ftp://x' })

    expect(result.instanceApi).toEqual({ ok: false, error: 'Instance URL is not a valid http(s) URL' })
    expect(result.sparql).toEqual({ ok: false, error: 'SPARQL endpoint is not a valid http(s) URL' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports invalid SPARQL results', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ search: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ head: {} }) })

    const result = await probe()

    expect(result.sparql).toEqual({ ok: false, error: 'SPARQL response was not a valid SPARQL results document' })
    expect(result.instanceApi.ok).toBe(true)
  })

  it('maps network failures to errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const result = await probe()

    expect(result.instanceApi).toEqual({ ok: false, error: 'Could not reach the instance API' })
    expect(result.sparql).toEqual({ ok: false, error: 'Could not reach the SPARQL endpoint' })
  })
})
