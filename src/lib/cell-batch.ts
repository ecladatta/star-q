import type {
  DocumentAnnotation,
  DocumentAnnotationComponent,
  DocumentElement,
  Entity,
  EntityType,
} from '@/types/types'
import { createEntityFromComponent } from '@/lib/annotation-roles'

export type CellBatchCellRef = {
  elementIndex: number
  row: number
  col: number
}

export type CellBatchOffset = {
  start: number
  end: number
}

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

export function rowCellRefs(elementIndex: number, tableData: string[][], row: number): CellBatchCellRef[] {
  const cells: CellBatchCellRef[] = []
  const rowData = tableData[row]
  if (!rowData) {
    return cells
  }
  for (let col = 0; col < rowData.length; col++) {
    cells.push({ elementIndex, row, col })
  }
  return cells
}

export function allCellRefs(elementIndex: number, tableData: string[][]): CellBatchCellRef[] {
  const cells: CellBatchCellRef[] = []
  for (let row = 0; row < tableData.length; row++) {
    const rowData = tableData[row]
    if (!rowData) {
      continue
    }
    for (let col = 0; col < rowData.length; col++) {
      cells.push({ elementIndex, row, col })
    }
  }
  return cells
}

export function trimmedCellValue(cellText: string): { start: number, end: number, value: string } | null {
  const trimmed = cellText.trim()

  if (!trimmed) {
    return null
  }

  const leading = cellText.length - cellText.trimStart().length
  const trailing = cellText.length - cellText.trimEnd().length

  return {
    start: leading,
    end: cellText.length - trailing,
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

export function buildCellBatchPreview(input: CellBatchPreviewInput): CellBatchPreview {
  const { cells, documentElements, cellRole, fixed, existingAnnotations, newId } = input
  const rows: CellBatchPreviewRow[] = []
  const fixedIncomplete = CONSTANT_ROLES[cellRole].some(role => !fixed[role])

  for (const cell of dedupeCellRefs(cells)) {
    const element = documentElements[cell.elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    const cellText = tableData?.[cell.row]?.[cell.col]
    const value = typeof cellText === 'string' ? trimmedCellValue(cellText) : null

    if (fixedIncomplete || !value) {
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
      annotationStart: value.start,
      annotationEnd: value.end,
      annotationRow: cell.row,
      annotationCell: cell.col,
      annotationValue: value.value,
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

export type CellBatchAnnotationItem = {
  subject: DocumentAnnotationComponent
  subjectEntity: Entity | null
  predicate: DocumentAnnotationComponent
  predicateEntity: Entity | null
  object: DocumentAnnotationComponent
  objectEntity: Entity | null
}

export type BatchAnnotationItem = CellBatchAnnotationItem

export function buildBatchAnnotationItem(input: {
  row: CellBatchPreviewRow & { component: DocumentAnnotationComponent }
  cellRole: EntityType
  fixed: CellBatchFixedSlots & Record<EntityType, DocumentAnnotationComponent>
  cellEntities: Map<string, Entity>
}): CellBatchAnnotationItem {
  const { row, cellRole, fixed, cellEntities } = input
  const chosenComp = row.component
  const chosenEntity = cellEntities.get(cellKey(row.cell)) ?? null
  const subjectComp = cellRole === 'subject' ? chosenComp : fixed.subject
  const predicateComp = cellRole === 'predicate' ? chosenComp : fixed.predicate
  const objectComp = cellRole === 'object' ? chosenComp : fixed.object

  return {
    subject: subjectComp,
    subjectEntity: cellRole === 'subject'
      ? chosenEntity
      : subjectComp
        ? createEntityFromComponent(subjectComp)
        : null,
    predicate: predicateComp,
    predicateEntity: cellRole === 'predicate'
      ? chosenEntity
      : predicateComp
        ? createEntityFromComponent(predicateComp)
        : null,
    object: objectComp,
    objectEntity: cellRole === 'object'
      ? chosenEntity
      : objectComp
        ? createEntityFromComponent(objectComp)
        : null,
  }
}
