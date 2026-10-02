import type { ExportModel } from '@/types/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { asConceptBaseUri } from '@/lib/wikibase'
import { buildExportFileResponse } from './export-response'
import { serializeExport } from './serialize-corpus-export'

vi.mock('./serialize-corpus-export', () => ({ serializeExport: vi.fn() }))
vi.mock('@/auth', () => ({ auth: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(serializeExport).mockReturnValue({
    body: 'BODY',
    contentType: 'application/json',
    extension: 'json',
  })
})

function exportRequest(query = ''): Request {
  return new Request(`http://example.com/api/export${query}`)
}

function model(overrides: Partial<ExportModel> = {}): ExportModel {
  return {
    exportMeta: { version: '1.4', type: 'full-corpus-export' },
    id: 'c1',
    title: 'My Corpus',
    createdAt: null,
    updatedAt: null,
    documents: [],
    units: [],
    customEntities: [],
    wikibase: {
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: asConceptBaseUri('https://wikibase.example'),
    },
    ...overrides,
  }
}

describe('buildExportFileResponse', () => {
  it('rejects an unsupported format with a 400', async () => {
    const response = await buildExportFileResponse(exportRequest('?format=excel'), model())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Unsupported export format or RDF mode. Use json, quickstatements, or use rdf with mode=truthy|full.',
    })
    expect(serializeExport).not.toHaveBeenCalled()
  })

  it('rejects an RDF format without a Wikibase instance with a 400', async () => {
    const response = await buildExportFileResponse(exportRequest('?format=rdf'), model({ wikibase: null }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'RDF export requires a Wikibase instance, and none is available for this corpus.',
    })
    expect(serializeExport).not.toHaveBeenCalled()
  })

  it('returns the serialized body with attachment headers', async () => {
    const response = await buildExportFileResponse(exportRequest('?format=json'), model())

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="My-Corpus.json"')
    expect(response.headers.get('X-QuickStatements-Skipped')).toBeNull()
    expect(await response.text()).toBe('BODY')
  })

  it('falls back to the corpus id in the filename when the title is blank', async () => {
    const response = await buildExportFileResponse(exportRequest('?format=json'), model({ title: '   ' }))

    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="corpus-c1.json"')
  })

  it('exposes the skipped count as a header for quickstatements exports', async () => {
    vi.mocked(serializeExport).mockReturnValue({
      body: 'QS',
      contentType: 'text/tab-separated-values; charset=utf-8',
      extension: 'qs',
      skippedCount: 2,
    })

    const response = await buildExportFileResponse(exportRequest('?format=quickstatements'), model())

    expect(response.headers.get('Content-Type')).toBe('text/tab-separated-values; charset=utf-8')
    expect(response.headers.get('X-QuickStatements-Skipped')).toBe('2')
  })
})
