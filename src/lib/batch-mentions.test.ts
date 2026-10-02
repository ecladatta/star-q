import type { BatchPreviewRow } from './batch-mentions'
import type { DocumentAnnotation, DocumentAnnotationComponent, TextOrTableElement } from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  allCellRefs,
  buildBatchAnnotationItem,
  buildBatchPreview,
  cellDomKey,
  cellsInRect,
  columnCellRefs,
  dedupeMentions,
  materializeBatchMentionQuantity,
  mentionKey,
  rectContainsCell,
  rowCellRefs,
  spanMentionComponent,
  spanRefFromComponent,
  trimmedCellValue,
} from './batch-mentions'

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
    unit: null,
    quantityLowerBound: null,
    quantityUpperBound: null,
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

const tableElement: TextOrTableElement = {
  type: 'table',
  elementIndex: 0,
  data: {},
  components: [],
  value: [
    ['Name', 'Birth'],
    ['Ada Lovelace', '1815'],
    ['  ', ''],
    ['Alan Turing', '1912'],
  ],
} as TextOrTableElement

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

describe('mentionKey / cellDomKey', () => {
  it('builds stable keys', () => {
    const cell = { kind: 'cell', elementIndex: 2, row: 3, col: 1 } as const
    expect(mentionKey(cell)).toBe('cell:2:3:1')
    expect(cellDomKey(cell)).toBe('3-1')
  })

  it('separates title and body spans at the same offsets', () => {
    const title = { kind: 'span', elementIndex: 2, title: true, start: 0, end: 5, value: 'Ada' } as const
    const body = { kind: 'span', elementIndex: 2, title: false, start: 0, end: 5, value: 'Ada' } as const
    expect(mentionKey(title)).toBe('span:2:t:0:5')
    expect(mentionKey(body)).toBe('span:2:b:0:5')
    expect(mentionKey(title)).not.toBe(mentionKey(body))
  })
})

describe('compareCellRefs / dedupeMentions', () => {
  it('sorts by element, row, col', () => {
    const refs = [
      { kind: 'cell', elementIndex: 0, row: 2, col: 0 },
      { kind: 'cell', elementIndex: 1, row: 1, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 1, col: 1 },
      { kind: 'cell', elementIndex: 0, row: 1, col: 0 },
    ] as const
    const sorted = dedupeMentions(refs.map(ref => ({ ...ref })))
    expect(sorted.map(mentionKey)).toEqual(['cell:0:1:0', 'cell:0:1:1', 'cell:0:2:0', 'cell:1:1:0'])
  })

  it('removes duplicate cells', () => {
    const refs = [
      { kind: 'cell', elementIndex: 0, row: 1, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 1, col: 0 },
    ] as const
    expect(dedupeMentions(refs.map(ref => ({ ...ref })))).toHaveLength(1)
  })

  it('removes duplicate spans and keeps both kinds', () => {
    const span = { kind: 'span', elementIndex: 0, title: false, start: 3, end: 9, value: 'habitat' } as const
    const mentions = dedupeMentions([
      { ...span },
      { kind: 'cell', elementIndex: 0, row: 1, col: 0 },
      { ...span },
    ])
    expect(mentions).toHaveLength(2)
    expect(mentions.map(mentionKey)).toEqual(['cell:0:1:0', mentionKey(span)])
  })
})

describe('cellsInRect', () => {
  it('builds a rectangle within one element regardless of drag direction', () => {
    const a = { kind: 'cell', elementIndex: 0, row: 1, col: 0 } as const
    const b = { kind: 'cell', elementIndex: 0, row: 3, col: 2 } as const
    expect(cellsInRect(a, b)).toHaveLength(9)
    expect(cellsInRect(b, a).map(mentionKey)).toEqual(cellsInRect(a, b).map(mentionKey))
  })

  it('returns empty when crossing elements', () => {
    expect(cellsInRect({ kind: 'cell', elementIndex: 0, row: 1, col: 0 }, { kind: 'cell', elementIndex: 1, row: 1, col: 0 })).toEqual([])
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
      { kind: 'cell', elementIndex: 0, row: 1, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 1, col: 1 },
    ])
  })

  it('spans the header row when targeted', () => {
    const refs = rowCellRefs(0, tableElement.value as string[][], 0)
    expect(refs).toEqual([
      { kind: 'cell', elementIndex: 0, row: 0, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 0, col: 1 },
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
      { kind: 'cell', elementIndex: 0, row: 0, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 0, col: 1 },
      { kind: 'cell', elementIndex: 0, row: 1, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 1, col: 1 },
      { kind: 'cell', elementIndex: 0, row: 2, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 2, col: 1 },
      { kind: 'cell', elementIndex: 0, row: 3, col: 0 },
      { kind: 'cell', elementIndex: 0, row: 3, col: 1 },
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

describe('rectContainsCell', () => {
  it('reports containment within the inclusive bounding rect of the same element', () => {
    const from = { kind: 'cell', elementIndex: 0, row: 1, col: 1 } as const
    const to = { kind: 'cell', elementIndex: 0, row: 3, col: 2 } as const

    expect(rectContainsCell(from, to, { kind: 'cell', elementIndex: 0, row: 2, col: 2 })).toBe(true)
    expect(rectContainsCell(from, to, { kind: 'cell', elementIndex: 0, row: 1, col: 2 })).toBe(true)
    expect(rectContainsCell(from, to, { kind: 'cell', elementIndex: 0, row: 3, col: 1 })).toBe(true)
    expect(rectContainsCell(from, to, { kind: 'cell', elementIndex: 0, row: 0, col: 1 })).toBe(false)
    expect(rectContainsCell(from, to, { kind: 'cell', elementIndex: 0, row: 2, col: 3 })).toBe(false)
    expect(rectContainsCell(from, to, { kind: 'cell', elementIndex: 1, row: 2, col: 2 })).toBe(false)
  })
})

describe('spanRefFromComponent', () => {
  it('builds a body-span ref from a page-text component', () => {
    const element: TextOrTableElement = {
      type: 'text',
      elementIndex: 3,
      data: { title: 'Habitat' },
      components: [],
      value: 'The natural habitat of the species',
    } as TextOrTableElement
    const ref = spanRefFromComponent(component({
      annotationType: 'text',
      annotationValue: 'natural habitat',
      annotationStart: 4,
      annotationEnd: 19,
      annotationRow: null,
      annotationCell: null,
      elementIndex: 3,
    }), element)

    expect(ref).toEqual({
      kind: 'span',
      elementIndex: 3,
      title: false,
      start: 4,
      end: 19,
      value: 'natural habitat',
    })
  })

  it('marks heading spans via the renderer slice heuristic', () => {
    const element: TextOrTableElement = {
      type: 'text',
      elementIndex: 0,
      data: { title: 'Habitat' },
      components: [],
      value: 'The natural habitat of the species',
    } as TextOrTableElement
    const ref = spanRefFromComponent(component({
      annotationType: 'text',
      annotationValue: 'Habitat',
      annotationStart: 0,
      annotationEnd: 7,
      annotationRow: null,
      annotationCell: null,
      elementIndex: 0,
    }), element)

    expect(ref?.title).toBe(true)
  })

  it('rejects table components', () => {
    expect(spanRefFromComponent(component({
      annotationType: 'table',
      annotationRow: 1,
      annotationCell: 0,
      annotationValue: 'Ada Lovelace',
    }))).toBeNull()
  })

  it('rejects cell-partial text mentions', () => {
    expect(spanRefFromComponent(component({
      annotationType: 'text',
      annotationRow: 1,
      annotationCell: 2,
      annotationValue: 'Ada',
    }))).toBeNull()
  })
})

describe('spanMentionComponent', () => {
  it('builds a display component with a deterministic id', () => {
    const mention = { kind: 'span', elementIndex: 4, title: false, start: 2, end: 8, value: 'tiger' } as const
    const comp = spanMentionComponent(mention, 'object')
    expect(comp.id).toBe(`batch-mention:${mentionKey(mention)}`)
    expect(comp.annotationStart).toBe(2)
    expect(comp.annotationEnd).toBe(8)
    expect(comp.annotationValue).toBe('tiger')
    expect(comp.annotationRow).toBeNull()
    expect(comp.annotationCell).toBeNull()
    expect(comp.annotationType).toBe('text')
    expect(comp.annotationTag).toBe('object')
    expect(comp.elementIndex).toBe(4)
  })
})

describe('buildBatchPreview', () => {
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
  const mentions = columnCellRefs(0, tableElement.value as string[][], 0)

  const baseInput = {
    mentions,
    elements: [tableElement],
    batchRole: 'object' as const,
    fixed: { subject, predicate, object: null },
    existingAnnotations: [] as DocumentAnnotation[],
  }

  it('creates one component per non-empty cell and skips empties', () => {
    const preview = buildBatchPreview(baseInput)

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

  it('gives preview components deterministic ids', () => {
    const preview = buildBatchPreview(baseInput)
    const [first] = preview.rows
    expect(first.component?.id).toBe(`batch-mention:${mentionKey(first.mention)}`)
  })

  it('fills the subject slot instead when the cells are the subject', () => {
    const preview = buildBatchPreview({
      ...baseInput,
      batchRole: 'subject',
      fixed: { subject: null, predicate, object: predicate },
    })

    const first = preview.rows[0]
    expect(first.component?.annotationTag).toBe('subject')
    expect(first.status).toBe('create')
  })

  it('marks all rows empty when a constant slot is missing', () => {
    const preview = buildBatchPreview({
      ...baseInput,
      fixed: { subject: null, predicate, object: null },
    })

    expect(preview.emptyCount).toBe(3)
    expect(preview.createCount).toBe(0)
  })

  it('marks all rows empty when the cells are the subject and subject constants are required', () => {
    const preview = buildBatchPreview({
      ...baseInput,
      batchRole: 'subject',
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

    const preview = buildBatchPreview({
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

    const preview = buildBatchPreview({
      ...baseInput,
      existingAnnotations: [existing],
    })

    expect(preview.rows[0].status).toBe('duplicate')
  })

  it('marks rows empty when the cell is outside the table', () => {
    const preview = buildBatchPreview({
      ...baseInput,
      mentions: [{ kind: 'cell', elementIndex: 0, row: 10, col: 0 }],
    })

    expect(preview.emptyCount).toBe(1)
  })

  it('creates components from span refs without an element lookup', () => {
    const span = { kind: 'span', elementIndex: 7, title: false, start: 4, end: 19, value: 'natural habitat' } as const
    const preview = buildBatchPreview({
      ...baseInput,
      mentions: [span],
      elements: [],
    })

    expect(preview.createCount).toBe(1)
    const [row] = preview.rows
    expect(row.status).toBe('create')
    expect(row.component?.annotationValue).toBe('natural habitat')
    expect(row.component?.annotationStart).toBe(4)
    expect(row.component?.annotationEnd).toBe(19)
    expect(row.component?.annotationRow).toBeNull()
    expect(row.component?.annotationCell).toBeNull()
    expect(row.component?.annotationType).toBe('text')
    expect(row.component?.annotationTag).toBe('object')
    expect(row.component?.elementIndex).toBe(7)
    expect(row.component?.id).toBe(`batch-mention:${mentionKey(span)}`)
  })

  it('marks span rows empty when a constant slot is missing', () => {
    const span = { kind: 'span', elementIndex: 7, title: false, start: 4, end: 19, value: 'natural habitat' } as const
    const preview = buildBatchPreview({
      ...baseInput,
      mentions: [span],
      fixed: { subject, predicate: null, object: null },
    })

    expect(preview.emptyCount).toBe(1)
    expect(preview.createCount).toBe(0)
  })

  it('flags span rows identical to an existing annotation as duplicates', () => {
    const span = { kind: 'span', elementIndex: 7, title: false, start: 4, end: 19, value: 'natural habitat' } as const
    const existing = annotation({
      subject,
      predicate,
      object: component({
        annotationTag: 'object',
        annotationStart: 4,
        annotationEnd: 19,
        annotationRow: null,
        annotationCell: null,
        annotationValue: 'natural habitat',
        annotationType: 'text',
        elementIndex: 7,
      }),
    })

    const preview = buildBatchPreview({
      ...baseInput,
      mentions: [span],
      existingAnnotations: [existing],
    })

    expect(preview.duplicateCount).toBe(1)
    expect(preview.rows[0].status).toBe('duplicate')
  })

  it('previews mixed cell and span mentions in one batch', () => {
    const span = { kind: 'span', elementIndex: 7, title: false, start: 4, end: 19, value: 'natural habitat' } as const
    const preview = buildBatchPreview({
      ...baseInput,
      mentions: [...mentions, span],
    })

    expect(preview.rows.map(row => row.mention.kind)).toEqual(['cell', 'cell', 'cell', 'span'])
    expect(preview.createCount).toBe(3)
  })
})

describe('materializeBatchMentionQuantity', () => {
  const unit = { id: null, label: 'megabyte', wikidataId: 'Q79735' }

  it('extracts the amount and bounds from the text', () => {
    expect(materializeBatchMentionQuantity({
      text: '0.576–1.152',
      shared: { value: '', lowerBound: '', upperBound: '', unit },
    })).toEqual({ value: '0.576', lowerBound: '0.576', upperBound: '1.152', unit })
  })

  it('a typed amount wins over the text', () => {
    expect(materializeBatchMentionQuantity({
      text: '6.0000',
      shared: { value: '6', lowerBound: '', upperBound: '', unit },
    })).toEqual({ value: '6', lowerBound: '', upperBound: '', unit })
  })

  it('a typed amount fills a selection whose text has no number', () => {
    expect(materializeBatchMentionQuantity({
      text: 'DDR SDRAM',
      shared: { value: '6', lowerBound: '', upperBound: '', unit },
    })).toEqual({ value: '6', lowerBound: '', upperBound: '', unit })
  })

  it('assigns a mention-only quantity to a selection whose text has no number', () => {
    expect(materializeBatchMentionQuantity({
      text: 'DDR SDRAM',
      shared: { value: '', lowerBound: '', upperBound: '', unit },
    })).toEqual({ value: '', lowerBound: '', upperBound: '', unit })
  })
})

describe('buildBatchAnnotationItem', () => {
  const row = {
    mention: { kind: 'cell', elementIndex: 0, row: 1, col: 0 },
    status: 'create',
    component: component({
      annotationTag: 'subject',
      annotationValue: 'Ada Lovelace',
      annotationRow: 1,
      annotationCell: 0,
    }),
  } satisfies BatchPreviewRow & { component: DocumentAnnotationComponent }

  it('uses the per-mention entity for the mention role', () => {
    const item = buildBatchAnnotationItem({
      row,
      batchRole: 'subject',
      fixed: { subject: row.component, predicate: component({ annotationTag: 'predicate' }), object: component({ annotationTag: 'object' }) },
      mentionEntities: new Map([[mentionKey(row.mention), { label: 'Ada Lovelace', value: 'Q7254', type: 'subject', custom: false, customId: null, datatype: null }]]),
      mentionQuantities: new Map(),
    })

    expect(item.subject).toBe(row.component)
    expect(item.subjectEntity?.value).toBe('Q7254')
  })

  it('falls back to a null entity when the mention has none', () => {
    const item = buildBatchAnnotationItem({
      row,
      batchRole: 'subject',
      fixed: { subject: row.component, predicate: component({ annotationTag: 'predicate' }), object: component({ annotationTag: 'object' }) },
      mentionEntities: new Map(),
      mentionQuantities: new Map(),
    })

    expect(item.subjectEntity).toBeNull()
  })

  it('applies a per-mention quantity with amount, bounds and mention', () => {
    const cell = component({
      annotationTag: 'object',
      annotationValue: '0.576–1.152',
      annotationRow: 1,
      annotationCell: 0,
    })
    const item = buildBatchAnnotationItem({
      row: { ...row, component: cell },
      batchRole: 'object',
      fixed: { subject: component({ annotationTag: 'subject' }), predicate: component({ annotationTag: 'predicate' }), object: cell },
      mentionEntities: new Map(),
      mentionQuantities: new Map([[mentionKey(row.mention), {
        value: '0.576',
        lowerBound: '0.576',
        upperBound: '1.152',
        unit: { id: null, label: 'metre', wikidataId: 'Q11573' },
      }]]),
    })

    expect(item.object?.entityValue).toBe('0.576')
    expect(item.object?.quantityLowerBound).toBe('0.576')
    expect(item.object?.quantityUpperBound).toBe('1.152')
    expect(item.object?.unit).toEqual({ id: null, label: 'metre', wikidataId: 'Q11573' })
    expect(item.object?.entityDatatype).toBe('decimal')
  })

  it('keeps a per-mention mention without an amount untyped', () => {
    const cell = component({
      annotationTag: 'object',
      annotationValue: '32',
      annotationRow: 1,
      annotationCell: 0,
    })
    const item = buildBatchAnnotationItem({
      row: { ...row, component: cell },
      batchRole: 'object',
      fixed: { subject: component({ annotationTag: 'subject' }), predicate: component({ annotationTag: 'predicate' }), object: cell },
      mentionEntities: new Map(),
      mentionQuantities: new Map([[mentionKey(row.mention), {
        value: '',
        lowerBound: '',
        upperBound: '',
        unit: { id: null, label: 'megabyte', wikidataId: 'Q79735' },
      }]]),
    })

    expect(item.object?.entityValue).toBeNull()
    expect(item.object?.unit).toEqual({ id: null, label: 'megabyte', wikidataId: 'Q79735' })
    expect(item.object?.entityDatatype).toBeNull()
  })

  it('the per-mention entity wins over a per-mention quantity', () => {
    const cell = component({
      annotationTag: 'object',
      annotationValue: '512 MB',
      annotationRow: 1,
      annotationCell: 0,
    })
    const item = buildBatchAnnotationItem({
      row: { ...row, component: cell },
      batchRole: 'object',
      fixed: { subject: component({ annotationTag: 'subject' }), predicate: component({ annotationTag: 'predicate' }), object: cell },
      mentionEntities: new Map([[mentionKey(row.mention), { label: '512 MB', value: '512 MB', type: 'object', custom: true, customId: 'ce-1', datatype: null }]]),
      mentionQuantities: new Map([[mentionKey(row.mention), {
        value: '512',
        lowerBound: '',
        upperBound: '',
        unit: { id: null, label: 'megabyte', wikidataId: 'Q79735' },
      }]]),
    })

    expect(item.object?.unit).toBeNull()
    expect(item.object?.entityValue).toBeNull()
    expect(item.objectEntity?.value).toBe('512 MB')
  })

  it('a mention with neither entity nor quantity stays untouched', () => {
    const cell = component({
      annotationTag: 'object',
      annotationValue: '6.0000',
      annotationRow: 1,
      annotationCell: 0,
    })
    const item = buildBatchAnnotationItem({
      row: { ...row, component: cell },
      batchRole: 'object',
      fixed: { subject: component({ annotationTag: 'subject' }), predicate: component({ annotationTag: 'predicate' }), object: cell },
      mentionEntities: new Map(),
      mentionQuantities: new Map(),
    })

    expect(item.object?.unit).toBeNull()
    expect(item.object?.entityValue).toBeNull()
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
      batchRole: 'object',
      fixed: {
        subject: rowComp,
        predicate: occupation,
        object: rowComp,
      },
      mentionEntities: new Map(),
      mentionQuantities: new Map(),
    })

    expect(item.subjectEntity?.value).toBe('Q7254')
    expect(item.predicateEntity?.value).toBe('P106')
    expect(item.object).toBe(rowComp)
    expect(item.objectEntity).toBeNull()
  })

  it('uses the per-span entity for a span mention role', () => {
    const span = { kind: 'span', elementIndex: 7, title: false, start: 4, end: 19, value: 'natural habitat' } as const
    const spanComp = spanMentionComponent(span, 'object')
    const item = buildBatchAnnotationItem({
      row: { mention: span, status: 'create', component: spanComp },
      batchRole: 'object',
      fixed: {
        subject: component({ annotationTag: 'subject' }),
        predicate: component({ annotationTag: 'predicate' }),
        object: spanComp,
      },
      mentionEntities: new Map([[mentionKey(span), { label: 'habitat', value: 'Q5372', type: 'object', custom: false, customId: null, datatype: null }]]),
      mentionQuantities: new Map(),
    })

    expect(item.object).toBe(spanComp)
    expect(item.objectEntity?.value).toBe('Q5372')
  })
})
