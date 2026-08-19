import type {
  AnnotationExport,
  DocumentAnnotationComponent,
  DocumentAnnotationQualifierExport,
  ExportModel,
} from '@/types/types'
import { expect, it } from 'vitest'
import { serializeQuickStatementsCorpusExport } from './quickstatements-corpus-export'

function component(overrides: Partial<DocumentAnnotationComponent>): DocumentAnnotationComponent {
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

function qualifier(
  predicate: Partial<DocumentAnnotationComponent>,
  value: Partial<DocumentAnnotationComponent>,
  position: number,
): DocumentAnnotationQualifierExport {
  return {
    id: `q-${position}`,
    predicate: component({ annotationTag: 'qualifier-predicate', ...predicate }),
    value: component({ annotationTag: 'qualifier-value', ...value }),
    position,
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

function model(annotations: AnnotationExport[]): ExportModel {
  return {
    exportMeta: { version: '1.3', type: 'full-corpus-export' },
    id: 'corpus-1',
    title: 'Test',
    createdAt: null,
    updatedAt: null,
    customEntities: [],
    documents: [
      {
        id: 'doc-1',
        title: 'D',
        createdAt: '2020-01-01',
        updatedAt: null,
        completedAt: null,
        order: 0,
        raw: {} as ExportModel['documents'][number]['raw'],
        annotations,
      },
    ],
  }
}

function body(annotations: AnnotationExport[]): string {
  return serializeQuickStatementsCorpusExport(model(annotations)).body
}

function lines(annotations: AnnotationExport[]): string[] {
  return body(annotations).trim().split('\n')
}

it('emits an entity statement', () => {
  expect(body([annotation({
    subject: component({ entityValue: 'Q68550' }),
    predicate: component({ entityValue: 'P184', annotationTag: 'predicate' }),
    object: component({ entityValue: 'Q7099', annotationTag: 'object' }),
  })])).toBe('Q68550\tP184\tQ7099\n')
})

it('quotes strings and escapes embedded double quotes', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P69', annotationTag: 'predicate' }),
    object: component({ entityValue: 'University of Vienna', entityDatatype: 'string', annotationTag: 'object' }),
  })])).toBe('Q1\tP69\t"University of Vienna"\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P69', annotationTag: 'predicate' }),
    object: component({ entityValue: 'Say "hi" now', entityDatatype: 'string', annotationTag: 'object' }),
  })])).toBe('Q1\tP69\t"Say ""hi"" now"\n')
})

it('emits numeric datatypes as quantities', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1082', annotationTag: 'predicate' }),
    object: component({ entityValue: '1360590', entityDatatype: 'integer', annotationTag: 'object' }),
  })])).toBe('Q1\tP1082\t1360590\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1082', annotationTag: 'predicate' }),
    object: component({ entityValue: '-3.5', entityDatatype: 'decimal', annotationTag: 'object' }),
  })])).toBe('Q1\tP1082\t-3.5\n')
})

it('normalizes leading-dot decimals', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1082', annotationTag: 'predicate' }),
    object: component({ entityValue: '.5', entityDatatype: 'decimal', annotationTag: 'object' }),
  })])).toBe('Q1\tP1082\t0.5\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1082', annotationTag: 'predicate' }),
    object: component({ entityValue: '-.5', entityDatatype: 'decimal', annotationTag: 'object' }),
  })])).toBe('Q1\tP1082\t-0.5\n')
})

it('pads and signs gYear values', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P569', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967', entityDatatype: 'gYear', annotationTag: 'object' }),
  })])).toBe('Q1\tP569\t+1967-00-00T00:00:00Z/9\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P569', annotationTag: 'predicate' }),
    object: component({ entityValue: '-384', entityDatatype: 'gYear', annotationTag: 'object' }),
  })])).toBe('Q1\tP569\t-0384-00-00T00:00:00Z/9\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P569', annotationTag: 'predicate' }),
    object: component({ entityValue: '5', entityDatatype: 'gYear', annotationTag: 'object' }),
  })])).toBe('Q1\tP569\t+0005-00-00T00:00:00Z/9\n')
})

it('emits gYearMonth and date with precision', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967-1', entityDatatype: 'gYearMonth', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t+1967-01-00T00:00:00Z/10\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P571', annotationTag: 'predicate' }),
    object: component({ entityValue: '2001-01-15', entityDatatype: 'date', annotationTag: 'object' }),
  })])).toBe('Q1\tP571\t+2001-01-15T00:00:00Z/11\n')
})

it('emits dateTime in UTC', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967-01-17T10:30:00', entityDatatype: 'dateTime', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t+1967-01-17T10:30:00Z/14\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967-01-17T10:30:00Z', entityDatatype: 'dateTime', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t+1967-01-17T10:30:00Z/14\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967-01-17T10:30:00+00:00', entityDatatype: 'dateTime', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t+1967-01-17T10:30:00Z/14\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967-01-17T10:30:00.5Z', entityDatatype: 'dateTime', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t+1967-01-17T10:30:00Z/14\n')
})

it('falls back to a string for non-UTC dateTime offsets', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967-01-17T10:30:00-05:00', entityDatatype: 'dateTime', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t"1967-01-17T10:30:00-05:00"\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: '1967-01-17T10:30:00+02:00', entityDatatype: 'dateTimeStamp', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t"1967-01-17T10:30:00+02:00"\n')
})

it('falls back to a string for unparseable dates', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: 'yesterday', entityDatatype: 'date', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t"yesterday"\n')
})

it('flattens qualifiers after the main value, sorted by position', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1082', annotationTag: 'predicate' }),
    object: component({ entityValue: '1360590', entityDatatype: 'integer', annotationTag: 'object' }),
    qualifiers: [
      qualifier({ entityValue: 'P459' }, { entityValue: 'Q39825' }, 1),
      qualifier({ entityValue: 'P585' }, { entityValue: '2000-08-01', entityDatatype: 'date' }, 0),
    ],
  })])).toBe(
    'Q1\tP1082\t1360590\tP585\t+2000-08-01T00:00:00Z/11\tP459\tQ39825\n',
  )
})

it('drops unmappable qualifiers but keeps the statement', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: 'x', entityDatatype: 'string', annotationTag: 'object' }),
    qualifiers: [
      qualifier({ entityValue: 'not-a-prop' }, { entityValue: 'v', entityDatatype: 'string' }, 0),
    ],
  })])).toBe('Q1\tP1\t"x"\n')
})

it('skips and counts annotations with a custom or unresolvable subject', () => {
  const customSubject = annotation({
    subject: component({ entityValue: 'MyEntity', entityCustom: true, entityCustomId: 'cu1' }),
  })
  const freeTextSubject = annotation({
    subject: component({ entityValue: 'Not an ID' }),
  })
  const missingObject = annotation({ object: undefined })

  const result = serializeQuickStatementsCorpusExport(model([
    annotation(),
    customSubject,
    freeTextSubject,
    missingObject,
  ]))

  expect(result.body).toBe('Q1\tP1\tQ2\n')
  expect(result.skippedCount).toBe(3)
})

it('deduplicates identical commands', () => {
  const statement = annotation({
    predicate: component({ entityValue: 'P69', annotationTag: 'predicate' }),
    object: component({ entityValue: 'University of Vienna', entityDatatype: 'string', annotationTag: 'object' }),
  })
  expect(lines([statement, { ...statement, id: 'a2' }])).toHaveLength(1)
})

it('emits URL, boolean and free-text values as strings', () => {
  expect(body([annotation({
    predicate: component({ entityValue: 'P856', annotationTag: 'predicate' }),
    object: component({ entityValue: 'https://kernel.org/', entityDatatype: 'anyURI', annotationTag: 'object' }),
  })])).toBe('Q1\tP856\t"https://kernel.org/"\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: 'true', entityDatatype: 'boolean', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t"true"\n')
  expect(body([annotation({
    predicate: component({ entityValue: 'P1', annotationTag: 'predicate' }),
    object: component({ entityValue: 'Antoni Ignacy Mietelski', annotationTag: 'object' }),
  })])).toBe('Q1\tP1\t"Antoni Ignacy Mietelski"\n')
})
