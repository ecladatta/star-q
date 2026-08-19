import type { ExportModel } from '@/types/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCorpusExportFilename, resolveCorpusExportFormat } from './corpus-export'

vi.mock('@/actions/annotation/annotationActions', () => ({ getAnnotations: vi.fn() }))
vi.mock('@/actions/corpus/corpusActions', () => ({
  getCorpus: vi.fn(),
  getCorpusCustomEntities: vi.fn(),
}))
vi.mock('@/actions/document/documentActions', () => ({
  getDocumentsMetadata: vi.fn(),
  getRawDocumentData: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function corpusExportRequest(query = ''): Request {
  return new Request(`http://example.com/api/corpus/c1/export${query}`)
}

describe('resolveCorpusExportFormat', () => {
  it('defaults to json without query params or matching accept header', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest())).toBe('json')
  })

  it('defaults to rdf-full when the accept header is text/turtle', () => {
    const request = new Request('http://example.com/api/corpus/c1/export', {
      headers: { accept: 'text/turtle; charset=utf-8' },
    })
    expect(resolveCorpusExportFormat(request)).toBe('rdf-full')
  })

  it('resolves json format', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=json'))).toBe('json')
  })

  it('rejects json with an unexpected mode', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=json&mode=full'))).toBeNull()
  })

  it('resolves quickstatements formats', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=quickstatements'))).toBe('quickstatements')
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=qs'))).toBe('quickstatements')
  })

  it('rejects quickstatements with a mode', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=qs&mode=truthy'))).toBeNull()
  })

  it('resolves rdf aliases to full mode by default', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=rdf'))).toBe('rdf-full')
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=ttl'))).toBe('rdf-full')
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=turtle'))).toBe('rdf-full')
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=rdf&mode=full'))).toBe('rdf-full')
  })

  it('resolves rdf truthy mode', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=rdf&mode=truthy'))).toBe('rdf-truthy')
  })

  it('rejects rdf with an unknown mode', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=rdf&mode=bogus'))).toBeNull()
  })

  it('rejects a mode without a format', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?mode=truthy'))).toBeNull()
  })

  it('rejects unknown formats', () => {
    expect(resolveCorpusExportFormat(corpusExportRequest('?format=excel'))).toBeNull()
  })
})

describe('getCorpusExportFilename', () => {
  function model(title: string | null): ExportModel {
    return {
      exportMeta: { version: '1.3', type: 'full-corpus-export' },
      id: 'corpus-1',
      title,
      createdAt: null,
      updatedAt: null,
      customEntities: [],
      documents: [],
    }
  }

  it('sanitizes a normal title', () => {
    expect(getCorpusExportFilename(model('My Corpus'), 'json')).toBe('My-Corpus.json')
  })

  it('replaces filesystem-hostile characters with hyphens', () => {
    expect(getCorpusExportFilename(model('a/b\\c?d*e'), 'json')).toBe('a-b-c-d-e.json')
  })

  it('collapses whitespace and repeated hyphens', () => {
    expect(getCorpusExportFilename(model('  a   b  '), 'ttl')).toBe('a-b.ttl')
    expect(getCorpusExportFilename(model('a--b'), 'ttl')).toBe('a-b.ttl')
  })

  it('trims leading and trailing hyphens', () => {
    expect(getCorpusExportFilename(model('- a -'), 'json')).toBe('a.json')
  })

  it('falls back to the corpus id when the title is blank', () => {
    expect(getCorpusExportFilename(model('   '), 'qs')).toBe('corpus-corpus-1.qs')
    expect(getCorpusExportFilename(model(null), 'qs')).toBe('corpus-corpus-1.qs')
  })
})
