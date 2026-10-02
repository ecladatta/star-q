import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getExportFilename, resolveExportFormat } from './corpus-export'

vi.mock('@/actions/annotation/annotationActions', () => ({ getAnnotations: vi.fn() }))
vi.mock('@/actions/corpus/corpusActions', () => ({
  getCorpus: vi.fn(),
  getCorpusCustomEntities: vi.fn(),
}))
vi.mock('@/actions/document/documentActions', () => ({
  getDocumentsMetadata: vi.fn(),
  getRawDocumentData: vi.fn(),
}))
vi.mock('@/lib/wikibase-server', () => ({ loadCorpusWikibaseConfig: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
})

function corpusExportRequest(query = ''): Request {
  return new Request(`http://example.com/api/corpus/c1/export${query}`)
}

describe('resolveExportFormat', () => {
  it('defaults to json without query params or matching accept header', () => {
    expect(resolveExportFormat(corpusExportRequest())).toBe('json')
  })

  it('defaults to rdf-full when the accept header is text/turtle', () => {
    const request = new Request('http://example.com/api/corpus/c1/export', {
      headers: { accept: 'text/turtle; charset=utf-8' },
    })
    expect(resolveExportFormat(request)).toBe('rdf-full')
  })

  it('resolves json format', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=json'))).toBe('json')
  })

  it('rejects json with an unexpected mode', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=json&mode=full'))).toBeNull()
  })

  it('resolves quickstatements formats', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=quickstatements'))).toBe('quickstatements')
    expect(resolveExportFormat(corpusExportRequest('?format=qs'))).toBe('quickstatements')
  })

  it('rejects quickstatements with a mode', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=qs&mode=truthy'))).toBeNull()
  })

  it('resolves rdf aliases to full mode by default', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=rdf'))).toBe('rdf-full')
    expect(resolveExportFormat(corpusExportRequest('?format=ttl'))).toBe('rdf-full')
    expect(resolveExportFormat(corpusExportRequest('?format=turtle'))).toBe('rdf-full')
    expect(resolveExportFormat(corpusExportRequest('?format=rdf&mode=full'))).toBe('rdf-full')
  })

  it('resolves rdf truthy mode', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=rdf&mode=truthy'))).toBe('rdf-truthy')
  })

  it('rejects rdf with an unknown mode', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=rdf&mode=bogus'))).toBeNull()
  })

  it('rejects a mode without a format', () => {
    expect(resolveExportFormat(corpusExportRequest('?mode=truthy'))).toBeNull()
  })

  it('rejects unknown formats', () => {
    expect(resolveExportFormat(corpusExportRequest('?format=excel'))).toBeNull()
  })
})

describe('getExportFilename', () => {
  it('sanitizes a normal title', () => {
    expect(getExportFilename('My Corpus', 'corpus-c1', 'json')).toBe('My-Corpus.json')
  })

  it('replaces filesystem-hostile characters with hyphens', () => {
    expect(getExportFilename('a/b\\c?d*e', 'corpus-c1', 'json')).toBe('a-b-c-d-e.json')
  })

  it('collapses whitespace and repeated hyphens', () => {
    expect(getExportFilename('  a   b  ', 'corpus-c1', 'ttl')).toBe('a-b.ttl')
    expect(getExportFilename('a--b', 'corpus-c1', 'ttl')).toBe('a-b.ttl')
  })

  it('trims leading and trailing hyphens', () => {
    expect(getExportFilename('- a -', 'corpus-c1', 'json')).toBe('a.json')
  })

  it('falls back to the fallback base when the title is blank or missing', () => {
    expect(getExportFilename('   ', 'corpus-corpus-1', 'qs')).toBe('corpus-corpus-1.qs')
    expect(getExportFilename(null, 'corpus-corpus-1', 'qs')).toBe('corpus-corpus-1.qs')
    expect(getExportFilename(undefined, 'document-doc-1', 'json')).toBe('document-doc-1.json')
  })
})
