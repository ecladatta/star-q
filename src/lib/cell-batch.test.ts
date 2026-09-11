import type { CellBatchPreviewRow } from './cell-batch'
import type { DocumentAnnotation, DocumentAnnotationComponent, DocumentElement } from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  allCellRefs,
  buildBatchAnnotationItem,
  buildCellBatchPreview,
  cellDomKey,
  cellKey,
  cellsInRect,
  columnCellRefs,
  dedupeCellRefs,
  rowCellRefs,
  trimmedCellValue,
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

describe('rowCellRefs', () => {
  it('spans every column of the row', () => {
    const refs = rowCellRefs(0, tableElement.value as string[][], 1)
    expect(refs).toEqual([
      { elementIndex: 0, row: 1, col: 0 },
      { elementIndex: 0, row: 1, col: 1 },
    ])
  })

  it('returns empty for missing rows', () => {
    expect(rowCellRefs(0, tableElement.value as string[][], 99)).toEqual([])
  })
})

describe('allCellRefs', () => {
  it('returns the header row and every data cell', () => {
    const refs = allCellRefs(0, tableElement.value as string[][])
    expect(refs).toEqual([
      { elementIndex: 0, row: 0, col: 0 },
      { elementIndex: 0, row: 0, col: 1 },
      { elementIndex: 0, row: 1, col: 0 },
      { elementIndex: 0, row: 1, col: 1 },
      { elementIndex: 0, row: 2, col: 0 },
      { elementIndex: 0, row: 2, col: 1 },
      { elementIndex: 0, row: 3, col: 0 },
      { elementIndex: 0, row: 3, col: 1 },
    ])
  })

  it('returns empty for an empty table', () => {
    expect(allCellRefs(0, [])).toEqual([])
  })
})

describe('trimmedCellValue', () => {
  it('returns the full trimmed cell', () => {
    expect(trimmedCellValue('  Ada  ')).toEqual({ start: 2, end: 5, value: 'Ada' })
  })

  it('returns null for empty results', () => {
    expect(trimmedCellValue('   ')).toBeNull()
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

  const baseInput = {
    cells,
    documentElements: [tableElement],
    cellRole: 'object' as const,
    fixed: { subject, predicate, object: null },
    existingAnnotations: [] as DocumentAnnotation[],
    newId,
  }

  it('creates one component per non-empty cell and skips empties', () => {
    const preview = buildCellBatchPreview(baseInput)

    expect(preview.createCount).toBe(2)
    expect(preview.emptyCount).toBe(1)
    expect(preview.duplicateCount).toBe(0)

    const [first, skipped, second] = preview.rows
    expect(first.status).toBe('create')
    expect(first.component?.annotationValue).toBe('Ada Lovelace')
    expect(first.component?.annotationRow).toBe(1)
    expect(first.component?.annotationCell).toBe(0)
    expect(first.component?.annotationType).toBe('table')
    expect(first.component?.annotationTag).toBe('object')
    expect(skipped.status).toBe('empty')
    expect(skipped.component).toBeNull()
    expect(second.component?.annotationValue).toBe('Alan Turing')
  })

  it('fills the subject slot instead when the cells are the subject', () => {
    const preview = buildCellBatchPreview({
      ...baseInput,
      cellRole: 'subject',
      fixed: { subject: null, predicate, object: predicate },
    })

    const first = preview.rows[0]
    expect(first.component?.annotationTag).toBe('subject')
    expect(first.status).toBe('create')
  })

  it('marks all rows empty when a constant slot is missing', () => {
    const preview = buildCellBatchPreview({
      ...baseInput,
      fixed: { subject: null, predicate, object: null },
    })

    expect(preview.emptyCount).toBe(3)
    expect(preview.createCount).toBe(0)
  })

  it('marks all rows empty when the cells are the subject and subject constants are required', () => {
    const preview = buildCellBatchPreview({
      ...baseInput,
      cellRole: 'subject',
      fixed: { subject: null, predicate: null, object: predicate },
    })

    expect(preview.emptyCount).toBe(3)
    expect(preview.createCount).toBe(0)
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
      ...baseInput,
      existingAnnotations: [existing],
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
      ...baseInput,
      existingAnnotations: [existing],
    })

    expect(preview.rows[0].status).toBe('duplicate')
  })

  it('marks rows empty when the cell is outside the table', () => {
    const preview = buildCellBatchPreview({
      ...baseInput,
      cells: [{ elementIndex: 0, row: 10, col: 0 }],
    })

    expect(preview.emptyCount).toBe(1)
  })
})

describe('buildBatchAnnotationItem', () => {
  const row: CellBatchPreviewRow = {
    cell: { elementIndex: 0, row: 1, col: 0 },
    status: 'create',
    component: component({
      annotationTag: 'subject',
      annotationValue: 'Ada Lovelace',
      annotationRow: 1,
      annotationCell: 0,
    }),
  }

  it('uses the per-cell entity for the cell role', () => {
    const item = buildBatchAnnotationItem({
      row,
      cellRole: 'subject',
      fixed: { subject: null, predicate: null, object: null },
      cellEntities: new Map([[cellKey(row.cell), { label: 'Ada Lovelace', value: 'Q7254', type: 'subject', custom: false, customId: null, datatype: null }]]),
    })

    expect(item.subject).toBe(row.component)
    expect(item.subjectEntity?.value).toBe('Q7254')
  })

  it('falls back to a null entity when the cell has none', () => {
    const item = buildBatchAnnotationItem({
      row,
      cellRole: 'subject',
      fixed: { subject: null, predicate: null, object: null },
      cellEntities: new Map(),
    })

    expect(item.subjectEntity).toBeNull()
  })

  it('derives entities for the fixed roles from their components', () => {
    const rowComp = component({
      annotationTag: 'subject',
      annotationValue: 'Ada Lovelace',
      entityValue: 'Q7254',
      annotationRow: 1,
      annotationCell: 0,
    })
    const occupation = component({ annotationTag: 'predicate', annotationValue: 'occupation', entityValue: 'P106' })
    const item = buildBatchAnnotationItem({
      row: { ...row, status: 'duplicate', component: rowComp },
      cellRole: 'object',
      fixed: {
        subject: rowComp,
        predicate: occupation,
        object: null,
      },
      cellEntities: new Map(),
    })

    expect(item.subjectEntity?.value).toBe('Q7254')
    expect(item.predicateEntity?.value).toBe('P106')
    expect(item.object).toBe(rowComp)
    expect(item.objectEntity).toBeNull()
  })
})
