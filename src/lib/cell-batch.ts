import type {
  DocumentAnnotation,
  DocumentAnnotationComponent,
  DocumentElement,
  EntityType,
} from '@/types/types'

export type CellBatchCellRef = {
  elementIndex: number
  row: number
  col: number
}

export type CellBatchOffset = {
  start: number
  end: number
}

export type CellExtraction
  = | { type: 'fixed', offset: CellBatchOffset }
    | { type: 'pattern', text: string }

export type CellBatchRowStatus = 'create' | 'duplicate' | 'empty'

export type CellBatchPreviewRow = {
  cell: CellBatchCellRef
  status: CellBatchRowStatus
  component: DocumentAnnotationComponent | null
}

export type CellBatchPreview = {
  rows: CellBatchPreviewRow[]
  createCount: number
  duplicateCount: number
  emptyCount: number
}

export type CellBatchElement = DocumentElement & { type?: 'text' | 'table' }

export type CellBatchFixedSlots = {
  subject: DocumentAnnotationComponent | null
  predicate: DocumentAnnotationComponent | null
  object: DocumentAnnotationComponent | null
}

// The roles that stay constant when the selected cells fill `cellRole`.
export const CONSTANT_ROLES: Record<EntityType, [EntityType, EntityType]> = {
  subject: ['predicate', 'object'],
  predicate: ['subject', 'object'],
  object: ['subject', 'predicate'],
}

export type CellBatchPreviewInput = {
  cells: CellBatchCellRef[]
  documentElements: CellBatchElement[]
  cellRole: EntityType
  fixed: CellBatchFixedSlots
  extraction: CellExtraction | null
  existingAnnotations: DocumentAnnotation[]
  newId: () => string
}

export function cellKey(cell: CellBatchCellRef): string {
  return `${cell.elementIndex}:${cell.row}:${cell.col}`
}

export function cellDomKey(cell: CellBatchCellRef): string {
  return `${cell.row}-${cell.col}`
}

export function compareCellRefs(a: CellBatchCellRef, b: CellBatchCellRef): number {
  return a.elementIndex - b.elementIndex || a.row - b.row || a.col - b.col
}

export function dedupeCellRefs(cells: CellBatchCellRef[]): CellBatchCellRef[] {
  const seen = new Set<string>()
  const unique: CellBatchCellRef[] = []
  for (const cell of cells) {
    const key = cellKey(cell)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(cell)
    }
  }
  return unique.sort(compareCellRefs)
}

export function cellsInRect(from: CellBatchCellRef, to: CellBatchCellRef): CellBatchCellRef[] {
  if (from.elementIndex !== to.elementIndex) {
    return []
  }

  const cells: CellBatchCellRef[] = []
  const rowStart = Math.min(from.row, to.row)
  const rowEnd = Math.max(from.row, to.row)
  const colStart = Math.min(from.col, to.col)
  const colEnd = Math.max(from.col, to.col)

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      cells.push({ elementIndex: from.elementIndex, row, col })
    }
  }
  return cells
}

export function columnCellRefs(elementIndex: number, tableData: string[][], col: number): CellBatchCellRef[] {
  const cells: CellBatchCellRef[] = []
  for (let row = 1; row < tableData.length; row++) {
    cells.push({ elementIndex, row, col })
  }
  return cells
}

export function sliceCellObject(
  cellText: string,
  offset: CellBatchOffset | null,
): { start: number, end: number, value: string } | null {
  const raw = offset ? cellText.slice(offset.start, offset.end) : cellText
  const trimmed = raw.trim()

  if (!trimmed) {
    return null
  }

  const leading = raw.length - raw.trimStart().length
  const trailing = raw.length - raw.trimEnd().length
  const base = offset ? offset.start : 0

  return {
    start: base + leading,
    end: base + raw.length - trailing,
    value: trimmed,
  }
}

function componentShapeMatches(
  a: DocumentAnnotationComponent | null,
  b: DocumentAnnotationComponent | null | undefined,
): boolean {
  if (!a || !b) {
    return false
  }

  return (
    a.elementIndex === b.elementIndex
    && a.annotationStart === b.annotationStart
    && a.annotationEnd === b.annotationEnd
    && a.annotationRow === b.annotationRow
    && a.annotationCell === b.annotationCell
    && a.annotationValue === b.annotationValue
    && a.annotationType === b.annotationType
  )
}

// Returns null when there is no extraction (entire cell semantics) and
// undefined when the extraction failed for this cell (skip the cell).
function offsetForCell(cellText: string, extraction: CellExtraction | null): CellBatchOffset | null | undefined {
  if (!extraction) {
    return null
  }
  if (extraction.type === 'fixed') {
    return extraction.offset
  }
  const index = cellText.indexOf(extraction.text)
  if (index === -1 || extraction.text.length === 0) {
    return undefined
  }
  return { start: index, end: index + extraction.text.length }
}

export function buildCellBatchPreview(input: CellBatchPreviewInput): CellBatchPreview {
  const { cells, documentElements, cellRole, fixed, extraction, existingAnnotations, newId } = input
  const rows: CellBatchPreviewRow[] = []
  const fixedIncomplete = CONSTANT_ROLES[cellRole].some(role => !fixed[role])

  for (const cell of dedupeCellRefs(cells)) {
    const element = documentElements[cell.elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    const cellText = tableData?.[cell.row]?.[cell.col]
    let sliced: { start: number, end: number, value: string } | null = null
    if (typeof cellText === 'string') {
      const offset = offsetForCell(cellText, extraction)
      if (offset !== undefined) {
        sliced = sliceCellObject(cellText, offset)
      }
    }

    if (fixedIncomplete || !sliced) {
      rows.push({ cell, status: 'empty', component: null })
      continue
    }

    const component: DocumentAnnotationComponent = {
      id: newId(),
      entityLabel: null,
      entityValue: null,
      entityCustom: null,
      entityCustomId: null,
      entityDatatype: null,
      annotationStart: sliced.start,
      annotationEnd: sliced.end,
      annotationRow: cell.row,
      annotationCell: cell.col,
      annotationValue: sliced.value,
      annotationType: 'table',
      annotationTag: cellRole,
      elementIndex: cell.elementIndex,
    }

    const slots: CellBatchFixedSlots = { ...fixed, [cellRole]: component }
    const duplicate = existingAnnotations.some(annotation =>
      componentShapeMatches(slots.subject, annotation.subject)
      && componentShapeMatches(slots.predicate, annotation.predicate)
      && componentShapeMatches(slots.object, annotation.object),
    )

    rows.push({ cell, status: duplicate ? 'duplicate' : 'create', component })
  }

  return {
    rows,
    createCount: rows.filter(row => row.status === 'create').length,
    duplicateCount: rows.filter(row => row.status === 'duplicate').length,
    emptyCount: rows.filter(row => row.status === 'empty').length,
  }
}
