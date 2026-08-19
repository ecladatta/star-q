import type {
  AnnotationExport,
  DocumentAnnotationComponent,
  ExportModel,
} from '@/types/types'
import { describe, expect, it } from 'vitest'
import { serializeRdfCorpusExport } from './rdf-corpus-export'

function component(overrides: Partial<DocumentAnnotationComponent> = {}): DocumentAnnotationComponent {
  return {
    id: 'c1',
    entityLabel: null,
    entityValue: null,
    entityCustom: false,
    entityCustomId: null,
    entityDatatype: null,
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

function annotation(overrides: Partial<AnnotationExport> = {}): AnnotationExport {
  return {
    id: 'a1',
    subject: component({ entityValue: 'Q1' }),
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: 'Q2', annotationTag: 'object' }),
    ...overrides,
  }
}

function rawText(): ExportModel['documents'][number]['raw'] {
  return {
    _source: {
      identificationMetadata: {
        id: 'x',
        title: 'D',
        versionDate: '2020',
        hash: 'h',
        url: ['https://example.org/'],
      },
      extractionMetadata: [{
        technology: 'text',
        texts: [{ startOffset: 0, endOffset: 11, value: 'Hello world' }],
        tables: [],
      }],
    },
  }
}

function rawTable(): ExportModel['documents'][number]['raw'] {
  return {
    _source: {
      identificationMetadata: {
        id: 'x',
        title: 'D',
        versionDate: '2020',
        hash: 'h',
        url: [],
      },
      extractionMetadata: [{
        technology: 'text',
        texts: [],
        tables: [{ startOffset: 0, endOffset: 10, tableData: [['H1', 'H2'], ['r1c1', 'r1c2']] }],
      }],
    },
  }
}

function model(annotations: AnnotationExport[], raw: ExportModel['documents'][number]['raw']): ExportModel {
  return {
    exportMeta: { version: '1.3', type: 'full-corpus-export' },
    id: 'corpus-1',
    title: 'Test',
    createdAt: null,
    updatedAt: null,
    customEntities: [],
    documents: [{
      id: 'doc-1',
      title: 'D',
      createdAt: '2020-01-01',
      updatedAt: null,
      completedAt: null,
      order: 0,
      raw,
      annotations,
    }],
  }
}

function truthy(annotations: AnnotationExport[]): string {
  return serializeRdfCorpusExport(model(annotations, rawText()), 'truthy')
}

describe('serializeRdfCorpusExport (truthy)', () => {
  it('emits a wikidata statement', () => {
    expect(truthy([annotation()])).toContain('wd:Q1 wdt:P1 wd:Q2.')
  })

  it('emits free-text objects as plain string literals', () => {
    expect(truthy([annotation({
      object: component({ entityValue: 'University of Vienna', entityDatatype: 'string', annotationTag: 'object' }),
    })])).toContain('wd:Q1 wdt:P1 "University of Vienna".')
  })

  it('emits typed numeric literals', () => {
    expect(truthy([annotation({
      object: component({ entityValue: '42', entityDatatype: 'integer', annotationTag: 'object' }),
    })])).toContain('wd:Q1 wdt:P1 42.')
  })

  it('emits typed date literals', () => {
    expect(truthy([annotation({
      object: component({ entityValue: '2000-08-01', entityDatatype: 'date', annotationTag: 'object' }),
    })])).toContain('wd:Q1 wdt:P1 "2000-08-01"^^xsd:date.')
  })

  it('emits qualifiers through a reified triple', () => {
    const output = truthy([annotation({
      object: component({ entityValue: '1360590', entityDatatype: 'integer', annotationTag: 'object' }),
      qualifiers: [{
        id: 'q1',
        position: 0,
        predicate: component({ entityValue: 'P585', annotationTag: 'qualifier-predicate' }),
        value: component({ entityValue: '2000-08-01', entityDatatype: 'date', annotationTag: 'qualifier-value' }),
      }],
    })])
    expect(output).toContain('rdf:reifies <<(wd:Q1 wdt:P1 1360590)>>;')
    expect(output).toContain('pq:P585 "2000-08-01"^^xsd:date.')
  })

  it('skips statements whose subject cannot be resolved to an IRI', () => {
    const output = truthy([annotation({
      subject: component({ entityValue: 'Not an ID' }),
    })])
    expect(output).not.toContain('wdt:P1')
  })
})

describe('serializeRdfCorpusExport (full)', () => {
  it('describes the corpus as a dcat dataset', () => {
    const output = serializeRdfCorpusExport(model([annotation()], rawText()), 'full')
    expect(output).toContain('corpus:corpus-1 a dcat:Dataset;')
    expect(output).toContain('dcterms:title "Test";')
    expect(output).toContain('dcterms:hasPart document:doc-1.')
  })

  it('describes the document with provenance source', () => {
    const output = serializeRdfCorpusExport(model([annotation()], rawText()), 'full')
    expect(output).toContain('document:doc-1 a foaf:Document;')
    expect(output).toContain('dcterms:isPartOf corpus:corpus-1;')
    expect(output).toContain('dcterms:source <https://example.org/>;')
  })

  it('projects text elements as NIF contexts', () => {
    const output = serializeRdfCorpusExport(model([annotation()], rawText()), 'full')
    expect(output).toContain('a nif:Context, nif:RFC5147String;')
    expect(output).toContain('nif:isString "Hello world".')
  })

  it('targets text annotations with a NIF phrase and oa annotation', () => {
    const output = serializeRdfCorpusExport(model([annotation({
      subject: component({ entityValue: 'Q1', annotationStart: 0, annotationEnd: 5, annotationValue: 'Hello' }),
    })], rawText()), 'full')
    expect(output).toContain('nif:anchorOf "Hello".')
    expect(output).toContain('a nif:Phrase, nif:RFC5147String;')
    expect(output).toContain('oa:hasBody wd:Q1.')
  })

  it('reifies the statement and links components via prov:wasDerivedFrom', () => {
    const output = serializeRdfCorpusExport(model([annotation()], rawText()), 'full')
    expect(output).toContain('statement:a1 rdf:reifies <<(wd:Q1 wdt:P1 wd:Q2)>>;')
    expect(output).toContain('prov:wasDerivedFrom annotation:c1')
  })

  it('projects tables as csvw tables, columns and cells', () => {
    const output = serializeRdfCorpusExport(model([annotation({
      subject: component({
        entityValue: 'Q1',
        annotationType: 'table',
        annotationStart: 0,
        annotationEnd: 4,
        annotationRow: 1,
        annotationCell: 0,
        annotationValue: 'r1c1',
      }),
      predicate: component({ entityValue: 'P1', annotationTag: 'predicate', annotationType: 'table', annotationRow: 0, annotationCell: 0 }),
      object: component({
        entityValue: 'Q2',
        annotationTag: 'object',
        annotationType: 'table',
        annotationRow: 1,
        annotationCell: 1,
        annotationValue: 'r1c2',
      }),
    })], rawTable()), 'full')
    expect(output).toContain('a csvw:Table;')
    expect(output).toContain('a csvw:Column;')
    expect(output).toContain('csvw:title "H1".')
    expect(output).toContain('a csvw:Cell;')
    expect(output).toContain('rdf:value "r1c1".')
  })
})
