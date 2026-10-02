import type { Corpus, Document } from '@/db/schema'
import type {
  DocumentAnnotation,
  DocumentAnnotationComponent,
  DocumentData,
} from '@/types/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus, getCorpusCustomEntities } from '@/actions/corpus/corpusActions'
import { getDocument, getRawDocumentData } from '@/actions/document/documentActions'
import { NotFoundError } from '@/lib/auth-utils'
import { asConceptBaseUri } from '@/lib/wikibase'
import { loadCorpusWikibaseConfig } from '@/lib/wikibase-server'
import { buildDocumentExportModel, getExportFilename, resolveExportFormat } from './corpus-export'

vi.mock('@/actions/annotation/annotationActions', () => ({ getAnnotations: vi.fn() }))
vi.mock('@/actions/corpus/corpusActions', () => ({
  getCorpus: vi.fn(),
  getCorpusCustomEntities: vi.fn(),
}))
vi.mock('@/actions/document/documentActions', () => ({
  getDocument: vi.fn(),
  getDocumentsMetadata: vi.fn(),
  getRawDocumentData: vi.fn(),
}))
vi.mock('@/db/drizzle', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue([]),
  },
}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
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

describe('buildDocumentExportModel', () => {
  function component(overrides: Partial<DocumentAnnotationComponent>): DocumentAnnotationComponent {
    return {
      id: 'c1',
      entityLabel: null,
      entityValue: null,
      entityCustom: false,
      entityCustomId: null,
      entityDatatype: null,
      unit: null,
      quantityLowerBound: null,
      quantityUpperBound: null,
      annotationStart: 0,
      annotationEnd: 1,
      annotationRow: null,
      annotationCell: null,
      annotationValue: '',
      annotationType: 'text',
      annotationTag: 'subject',
      elementIndex: 0,
      ...overrides,
    }
  }

  const corpus = {
    id: 'corpus-1',
    title: 'Test Corpus',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  } as Corpus

  const raw: DocumentData = {
    _source: {
      identificationMetadata: { id: 'doc-1', versionDate: '2024-02-01', hash: 'sha1:abc' },
      extractionMetadata: [],
    },
  }

  const doc: Document = {
    id: 'doc-1',
    corpusId: 'corpus-1',
    title: 'Doc',
    raw,
    completedAt: null,
    order: 2,
    createdAt: new Date('2024-02-01T00:00:00Z'),
    updatedAt: new Date('2024-02-02T00:00:00Z'),
  }

  const qualifier = {
    id: 'q-1',
    annotationId: 'a-1',
    predicateId: 'qp-1',
    valueId: 'qv-1',
    position: 0,
    predicate: component({ annotationTag: 'qualifier-predicate', entityValue: 'P585' }),
    value: component({ annotationTag: 'qualifier-value', entityValue: '2020-01-01', entityDatatype: 'date' }),
  }

  const docAnnotation: DocumentAnnotation = {
    id: 'a-1',
    subjectId: 's-1',
    predicateId: 'p-1',
    objectId: 'o-1',
    annotationId: 'a-1',
    documentId: 'doc-1',
    corpusId: 'corpus-1',
    subject: component({ annotationTag: 'subject', entityValue: 'Q1' }),
    predicate: component({ annotationTag: 'predicate', entityValue: 'P1' }),
    object: component({ annotationTag: 'object', entityValue: 'Q2' }),
    qualifiers: [qualifier],
  }

  function mockDocumentFixtures() {
    vi.mocked(getDocument).mockResolvedValue(doc)
    vi.mocked(getAnnotations).mockResolvedValue([docAnnotation])
    vi.mocked(getRawDocumentData).mockResolvedValue(raw)
    vi.mocked(getCorpus).mockResolvedValue(corpus)
    vi.mocked(getCorpusCustomEntities).mockResolvedValue([])
    vi.mocked(loadCorpusWikibaseConfig).mockResolvedValue({
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: asConceptBaseUri('https://wikibase.example'),
      label: 'Example',
    })
  }

  it('builds a single-document model over corpus-level metadata', async () => {
    mockDocumentFixtures()

    const model = await buildDocumentExportModel('doc-1')

    expect(model.exportMeta).toEqual({ version: '1.4', type: 'single-document-export' })
    expect(model.id).toBe('corpus-1')
    expect(model.title).toBe('Test Corpus')
    expect(model.createdAt).toBe('2024-01-01T00:00:00.000Z')
    expect(model.updatedAt).toBe('2024-01-02T00:00:00.000Z')
    expect(model.wikibase).toEqual({
      instance: 'https://wikibase.example',
      sparqlEndpoint: 'https://wikibase.example/query/sparql',
      conceptBaseUri: asConceptBaseUri('https://wikibase.example'),
    })
    expect(model.units).toEqual([])
    expect(model.customEntities).toEqual([])
    expect(getCorpus).toHaveBeenCalledWith('corpus-1')
  })

  it('maps the one document with its annotations and raw content', async () => {
    mockDocumentFixtures()

    const model = await buildDocumentExportModel('doc-1')

    expect(model.documents).toHaveLength(1)
    expect(model.documents[0]).toEqual({
      id: 'doc-1',
      title: 'Doc',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-02T00:00:00.000Z',
      completedAt: null,
      order: 2,
      raw,
      annotations: [
        {
          id: 'a-1',
          subject: docAnnotation.subject,
          predicate: docAnnotation.predicate,
          object: docAnnotation.object,
          qualifiers: [
            {
              id: 'q-1',
              predicate: qualifier.predicate,
              value: qualifier.value,
              position: 0,
            },
          ],
        },
      ],
    })
  })

  it('throws NotFoundError when the document does not exist', async () => {
    vi.mocked(getDocument).mockResolvedValue(null as unknown as Document)

    await expect(buildDocumentExportModel('missing')).rejects.toThrow(NotFoundError)
  })
})
