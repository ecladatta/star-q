import type { DocumentAnnotation, DocumentAnnotationComponent, DocumentElement } from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  buildCellBatchPreview,
  cellDomKey,
  cellKey,
  cellsInRect,
  columnCellRefs,
  dedupeCellRefs,
  sliceCellObject,
} from './cell-batch'

let idCounter = 0

function newId(): string {
  idCounter += 1
  return `id-${idCounter}`
}

function component(overrides: Partial<DocumentAnnotationComponent> = {}): DocumentAnnotationComponent {
  return {
    id: newId(),
    entityLabel: null,
    entityValue: null,
    entityCustom: null,
    entityCustomId: null,
    entityDatatype: null,
    annotationStart: 0,
    annotationEnd: 1,
    annotationRow: null,
    annotationCell: null,
    annotationValue: 'value',
    annotationType: 'table',
    annotationTag: 'subject',
    elementIndex: 0,
    ...overrides,
  }
}

const tableElement: DocumentElement & { type: 'text' | 'table' } = {
  type: 'table',
  components: [],
  value: [
    ['Name', 'Birth'],
    ['Ada Lovelace', '1815'],
    ['  ', ''],
    ['Alan Turing', '1912'],
  ],
}

function annotation(overrides: {
  subject?: DocumentAnnotationComponent
  predicate?: DocumentAnnotationComponent
  object?: DocumentAnnotationComponent
} = {}): DocumentAnnotation {
  return {
    id: newId(),
    subjectId: 's',
    predicateId: 'p',
    objectId: 'o',
    annotationId: null,
    documentId: 'd1',
    corpusId: 'c1',
    subject: overrides.subject ?? component({ annotationTag: 'subject' }),
    predicate: overrides.predicate ?? component({ annotationTag: 'predicate' }),
    object: overrides.object ?? component({ annotationTag: 'object' }),
    qualifiers: [],
  }
}

describe('cellKey / cellDomKey', () => {
  it('builds stable keys', () => {
    const cell = { elementIndex: 2, row: 3, col: 1 }
    expect(cellKey(cell)).toBe('2:3:1')
    expect(cellDomKey(cell)).toBe('3-1')
  })
})

describe('compareCellRefs / dedupeCellRefs', () => {
  it('sorts by element, row, col', () => {
    const refs = [
      { elementIndex: 0, row: 2, col: 0 },
      { elementIndex: 1, row: 1, col: 0 },
      { elementIndex: 0, row: 1, col: 1 },
      { elementIndex: 0, row: 1, col: 0 },
    ]
    const sorted = dedupeCellRefs(refs)
    expect(sorted.map(cellKey)).toEqual(['0:1:0', '0:1:1', '0:2:0', '1:1:0'])
  })

  it('removes duplicate cells', () => {
    const refs = [
      { elementIndex: 0, row: 1, col: 0 },
      { elementIndex: 0, row: 1, col: 0 },
    ]
    expect(dedupeCellRefs(refs)).toHaveLength(1)
  })
})

describe('cellsInRect', () => {
  it('builds a rectangle within one element regardless of drag direction', () => {
    const a = { elementIndex: 0, row: 1, col: 0 }
    const b = { elementIndex: 0, row: 3, col: 2 }
    expect(cellsInRect(a, b)).toHaveLength(9)
    expect(cellsInRect(b, a).map(cellKey)).toEqual(cellsInRect(a, b).map(cellKey))
  })

  it('returns empty when crossing elements', () => {
    expect(cellsInRect({ elementIndex: 0, row: 1, col: 0 }, { elementIndex: 1, row: 1, col: 0 })).toEqual([])
  })
})

describe('columnCellRefs', () => {
  it('skips the header row', () => {
    const refs = columnCellRefs(0, tableElement.value as string[][], 0)
    expect(refs.map(ref => ref.row)).toEqual([1, 2, 3])
  })
})

describe('sliceCellObject', () => {
  it('returns the full trimmed cell without offset', () => {
    expect(sliceCellObject('  Ada  ', null)).toEqual({ start: 2, end: 5, value: 'Ada' })
  })

  it('slices and trims with a relative offset', () => {
    expect(sliceCellObject('Ada Lovelace', { start: 4, end: 12 })).toEqual({ start: 4, end: 12, value: 'Lovelace' })
  })

  it('shrinks the slice around whitespace', () => {
    expect(sliceCellObject('Ada Lovelace', { start: 0, end: 4 })).toEqual({ start: 0, end: 3, value: 'Ada' })
  })

  it('returns null for empty results', () => {
    expect(sliceCellObject('   ', null)).toBeNull()
    expect(sliceCellObject('Ada', { start: 1, end: 1 })).toBeNull()
  })
})

describe('buildCellBatchPreview', () => {
  const subject = component({
    annotationTag: 'subject',
    annotationValue: 'scientist',
    annotationStart: 0,
    annotationEnd: 9,
    annotationRow: null,
    annotationCell: null,
    annotationType: 'text',
    elementIndex: 5,
  })
  const predicate = component({
    annotationTag: 'predicate',
    annotationValue: 'occupation',
    annotationStart: 0,
    annotationEnd: 10,
    annotationRow: null,
    annotationCell: null,
    annotationType: 'text',
    elementIndex: 5,
  })
  const cells = columnCellRefs(0, tableElement.value as string[][], 0)

  it('creates one object per non-empty cell and skips empties', () => {
    const preview = buildCellBatchPreview({
      cells,
      documentElements: [tableElement],
      offset: null,
      subject,
      predicate,
      existingAnnotations: [],
      newId,
    })

    expect(preview.createCount).toBe(2)
    expect(preview.emptyCount).toBe(1)
    expect(preview.duplicateCount).toBe(0)

    const [first, skipped, second] = preview.rows
    expect(first.status).toBe('create')
    expect(first.object?.annotationValue).toBe('Ada Lovelace')
    expect(first.object?.annotationRow).toBe(1)
    expect(first.object?.annotationCell).toBe(0)
    expect(first.object?.annotationType).toBe('table')
    expect(first.object?.annotationTag).toBe('object')
    expect(skipped.status).toBe('empty')
    expect(skipped.object).toBeNull()
    expect(second.object?.annotationValue).toBe('Alan Turing')
  })

  it('applies the same relative offset to every row', () => {
    const preview = buildCellBatchPreview({
      cells,
      documentElements: [tableElement],
      offset: { start: 0, end: 4 },
      subject,
      predicate,
      existingAnnotations: [],
      newId,
    })

    expect(preview.rows[0].object?.annotationValue).toBe('Ada')
    expect(preview.rows[2].object?.annotationValue).toBe('Alan')
  })

  it('flags rows identical to an existing annotation as duplicates', () => {
    const existing = annotation({
      subject,
      predicate,
      object: component({
        annotationTag: 'object',
        annotationStart: 0,
        annotationEnd: 12,
        annotationRow: 1,
        annotationCell: 0,
        annotationValue: 'Ada Lovelace',
        annotationType: 'table',
        elementIndex: 0,
      }),
    })

    const preview = buildCellBatchPreview({
      cells,
      documentElements: [tableElement],
      offset: null,
      subject,
      predicate,
      existingAnnotations: [existing],
      newId,
    })

    expect(preview.duplicateCount).toBe(1)
    expect(preview.createCount).toBe(1)
    expect(preview.rows[0].status).toBe('duplicate')
  })

  it('ignores entity fields when matching duplicates', () => {
    const existing = annotation({
      subject,
      predicate,
      object: component({
        annotationTag: 'object',
        annotationStart: 0,
        annotationEnd: 12,
        annotationRow: 1,
        annotationCell: 0,
        annotationValue: 'Ada Lovelace',
        annotationType: 'table',
        elementIndex: 0,
      }),
    })
    existing.subject = { ...existing.subject, entityValue: 'Q5' }

    const preview = buildCellBatchPreview({
      cells,
      documentElements: [tableElement],
      offset: null,
      subject,
      predicate,
      existingAnnotations: [existing],
      newId,
    })

    expect(preview.rows[0].status).toBe('duplicate')
  })

  it('marks all rows empty when subject or predicate is missing', () => {
    const preview = buildCellBatchPreview({
      cells,
      documentElements: [tableElement],
      offset: null,
      subject: null,
      predicate,
      existingAnnotations: [],
      newId,
    })

    expect(preview.emptyCount).toBe(3)
    expect(preview.createCount).toBe(0)
  })

  it('marks rows empty when the cell is outside the table', () => {
    const preview = buildCellBatchPreview({
      cells: [{ elementIndex: 0, row: 10, col: 0 }],
      documentElements: [tableElement],
      offset: null,
      subject,
      predicate,
      existingAnnotations: [],
      newId,
    })

    expect(preview.emptyCount).toBe(1)
  })
})
