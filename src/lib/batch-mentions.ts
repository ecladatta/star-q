import type {
  DocumentAnnotation,
  DocumentAnnotationComponent,
  Entity,
  EntityType,
  TextOrTableElement,
  UnitRef,
} from '@/types/types'
import { createEntityFromComponent } from '@/lib/annotation-roles'
import { isNumericEntityDatatype } from '@/lib/datatypes'
import { isValidQuantityAmount, parseQuantityHint } from '@/lib/numeric-units'

export type BatchCellRef = {
  kind: 'cell'
  elementIndex: number
  row: number
  col: number
}

// `title` separates heading spans from body spans sharing an elementIndex:
// both are annotationType 'text' with element-relative offsets, so without it
// a title span and a body span at the same offsets would share a key.
export type BatchSpanRef = {
  kind: 'span'
  elementIndex: number
  title: boolean
  start: number
  end: number
  value: string
}

export type BatchMention = BatchCellRef | BatchSpanRef

export type BatchMentionRow = {
  mention: BatchMention
  text: string
  filled: boolean
}

export function mentionKey(mention: BatchMention): string {
  return mention.kind === 'cell'
    ? `cell:${mention.elementIndex}:${mention.row}:${mention.col}`
    : `span:${mention.elementIndex}:${mention.title ? 't' : 'b'}:${mention.start}:${mention.end}`
}

export function cellDomKey(cell: BatchCellRef): string {
  return `${cell.row}-${cell.col}`
}

export function compareCellRefs(a: BatchCellRef, b: BatchCellRef): number {
  return a.elementIndex - b.elementIndex || a.row - b.row || a.col - b.col
}

function compareMentions(a: BatchMention, b: BatchMention): number {
  if (a.kind === 'cell' && b.kind === 'cell') {
    return compareCellRefs(a, b)
  }
  if (a.kind === 'span' && b.kind === 'span') {
    return a.elementIndex - b.elementIndex
      || (a.title === b.title ? 0 : a.title ? -1 : 1)
      || a.start - b.start
      || a.end - b.end
  }
  return a.elementIndex - b.elementIndex || (a.kind === 'cell' ? -1 : 1)
}

export function dedupeMentions<T extends BatchMention>(mentions: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const mention of mentions) {
    const key = mentionKey(mention)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(mention)
    }
  }
  return unique.sort(compareMentions)
}

// null unless the component is a page-text span: a table-cell mention (full or
// partial) carries row/col and is not one.
export function spanRefFromComponent(
  component: DocumentAnnotationComponent,
  element?: TextOrTableElement,
): BatchSpanRef | null {
  if (component.annotationType !== 'text' || component.annotationRow !== null || component.annotationCell !== null) {
    return null
  }

  const rawText = element?.type === 'text' ? element.value : undefined
  const rawTitle = element?.type === 'text' ? (element.data?.title ?? '') : undefined
  const title = rawText !== undefined
    && rawTitle.slice(component.annotationStart, component.annotationEnd) === component.annotationValue
    && rawText.slice(component.annotationStart, component.annotationEnd) !== component.annotationValue

  return {
    kind: 'span',
    elementIndex: component.elementIndex,
    title,
    start: component.annotationStart,
    end: component.annotationEnd,
    value: component.annotationValue,
  }
}

// Single source of truth for span -> display component. The id is
// deterministic so preview rows and rendered marks share identity across
// recomputes; the server assigns real identity on save.
export function spanMentionComponent(mention: BatchSpanRef, role: EntityType): DocumentAnnotationComponent {
  return {
    id: `batch-mention:${mentionKey(mention)}`,
    entityLabel: null,
    entityValue: null,
    entityCustom: null,
    entityCustomId: null,
    entityDatatype: null,
    unit: null,
    quantityLowerBound: null,
    quantityUpperBound: null,
    annotationStart: mention.start,
    annotationEnd: mention.end,
    annotationRow: null,
    annotationCell: null,
    annotationValue: mention.value,
    annotationType: 'text',
    annotationTag: role,
    elementIndex: mention.elementIndex,
  }
}

function rectBounds(from: BatchCellRef, to: BatchCellRef) {
  return {
    rowStart: Math.min(from.row, to.row),
    rowEnd: Math.max(from.row, to.row),
    colStart: Math.min(from.col, to.col),
    colEnd: Math.max(from.col, to.col),
  }
}

export function rectContainsCell(from: BatchCellRef, to: BatchCellRef, cell: BatchCellRef): boolean {
  const { rowStart, rowEnd, colStart, colEnd } = rectBounds(from, to)
  return cell.elementIndex === from.elementIndex
    && cell.elementIndex === to.elementIndex
    && cell.row >= rowStart
    && cell.row <= rowEnd
    && cell.col >= colStart
    && cell.col <= colEnd
}

export function cellsInRect(from: BatchCellRef, to: BatchCellRef): BatchCellRef[] {
  if (from.elementIndex !== to.elementIndex) {
    return []
  }

  const { rowStart, rowEnd, colStart, colEnd } = rectBounds(from, to)
  const cells: BatchCellRef[] = []
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      cells.push({ kind: 'cell', elementIndex: from.elementIndex, row, col })
    }
  }
  return cells
}

export function columnCellRefs(elementIndex: number, tableData: string[][], col: number): BatchCellRef[] {
  const cells: BatchCellRef[] = []
  for (let row = 1; row < tableData.length; row++) {
    cells.push({ kind: 'cell', elementIndex, row, col })
  }
  return cells
}

export function rowCellRefs(elementIndex: number, tableData: string[][], row: number): BatchCellRef[] {
  const cells: BatchCellRef[] = []
  const rowData = tableData[row]
  if (!rowData) {
    return cells
  }
  for (let col = 0; col < rowData.length; col++) {
    cells.push({ kind: 'cell', elementIndex, row, col })
  }
  return cells
}

export function allCellRefs(elementIndex: number, tableData: string[][]): BatchCellRef[] {
  const cells: BatchCellRef[] = []
  for (let row = 0; row < tableData.length; row++) {
    const rowData = tableData[row]
    if (!rowData) {
      continue
    }
    for (let col = 0; col < rowData.length; col++) {
      cells.push({ kind: 'cell', elementIndex, row, col })
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

export type BatchRowStatus = 'create' | 'duplicate' | 'empty'

export type BatchFixedSlots = {
  subject: DocumentAnnotationComponent | null
  predicate: DocumentAnnotationComponent | null
  object: DocumentAnnotationComponent | null
}

export type BatchPreviewRow = {
  mention: BatchMention
  status: BatchRowStatus
  component: DocumentAnnotationComponent | null
}

export type BatchPreview = {
  rows: BatchPreviewRow[]
  createCount: number
  duplicateCount: number
  emptyCount: number
}

export const CONSTANT_ROLES: Record<EntityType, [EntityType, EntityType]> = {
  subject: ['predicate', 'object'],
  predicate: ['subject', 'object'],
  object: ['subject', 'predicate'],
}

export type BatchPreviewInput = {
  mentions: BatchMention[]
  elements: TextOrTableElement[]
  batchRole: EntityType
  fixed: BatchFixedSlots
  existingAnnotations: DocumentAnnotation[]
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

export function buildBatchPreview(input: BatchPreviewInput): BatchPreview {
  const { mentions, elements, batchRole, fixed, existingAnnotations } = input
  const rows: BatchPreviewRow[] = []
  const fixedIncomplete = CONSTANT_ROLES[batchRole].some(role => !fixed[role])

  for (const mention of dedupeMentions(mentions)) {
    if (mention.kind === 'span') {
      if (fixedIncomplete || !mention.value) {
        rows.push({ mention, status: 'empty', component: null })
        continue
      }

      const component = spanMentionComponent(mention, batchRole)
      const slots: BatchFixedSlots = { ...fixed, [batchRole]: component }
      const duplicate = existingAnnotations.some(annotation =>
        componentShapeMatches(slots.subject, annotation.subject)
        && componentShapeMatches(slots.predicate, annotation.predicate)
        && componentShapeMatches(slots.object, annotation.object),
      )

      rows.push({ mention, status: duplicate ? 'duplicate' : 'create', component })
      continue
    }

    const element = elements[mention.elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    const cellText = tableData?.[mention.row]?.[mention.col]
    const value = typeof cellText === 'string' ? trimmedCellValue(cellText) : null

    if (fixedIncomplete || !value) {
      rows.push({ mention, status: 'empty', component: null })
      continue
    }

    const component: DocumentAnnotationComponent = {
      id: `batch-mention:${mentionKey(mention)}`,
      entityLabel: null,
      entityValue: null,
      entityCustom: null,
      entityCustomId: null,
      entityDatatype: null,
      unit: null,
      quantityLowerBound: null,
      quantityUpperBound: null,
      annotationStart: value.start,
      annotationEnd: value.end,
      annotationRow: mention.row,
      annotationCell: mention.col,
      annotationValue: value.value,
      annotationType: 'table',
      annotationTag: batchRole,
      elementIndex: mention.elementIndex,
    }

    const slots: BatchFixedSlots = { ...fixed, [batchRole]: component }
    const duplicate = existingAnnotations.some(annotation =>
      componentShapeMatches(slots.subject, annotation.subject)
      && componentShapeMatches(slots.predicate, annotation.predicate)
      && componentShapeMatches(slots.object, annotation.object),
    )

    rows.push({ mention, status: duplicate ? 'duplicate' : 'create', component })
  }

  return {
    rows,
    createCount: rows.filter(row => row.status === 'create').length,
    duplicateCount: rows.filter(row => row.status === 'duplicate').length,
    emptyCount: rows.filter(row => row.status === 'empty').length,
  }
}

export type BatchAnnotationItem = {
  subject: DocumentAnnotationComponent
  subjectEntity: Entity | null
  predicate: DocumentAnnotationComponent
  predicateEntity: Entity | null
  object: DocumentAnnotationComponent
  objectEntity: Entity | null
}

export type BatchMentionQuantity = {
  value: string
  lowerBound: string
  upperBound: string
  unit: UnitRef | null
}

export function materializeBatchMentionQuantity(input: {
  text: string
  shared: BatchMentionQuantity
}): BatchMentionQuantity {
  const { text, shared } = input
  if (shared.value.trim()) {
    return shared
  }
  const hint = parseQuantityHint(text)
  return {
    value: hint.amount ?? '',
    lowerBound: hint.lowerBound ?? '',
    upperBound: hint.upperBound ?? '',
    unit: shared.unit,
  }
}

function withMentionQuantity(
  component: DocumentAnnotationComponent,
  quantity: BatchMentionQuantity,
): DocumentAnnotationComponent {
  return {
    ...component,
    entityValue: quantity.value || null,
    quantityLowerBound: quantity.lowerBound || null,
    quantityUpperBound: quantity.upperBound || null,
    unit: quantity.unit,
    entityDatatype: quantity.value && isValidQuantityAmount(quantity.value)
      ? (isNumericEntityDatatype(component.entityDatatype) ? component.entityDatatype : 'decimal')
      : component.entityDatatype,
  }
}

export function buildBatchAnnotationItem(input: {
  row: BatchPreviewRow & { component: DocumentAnnotationComponent }
  batchRole: EntityType
  fixed: BatchFixedSlots & Record<EntityType, DocumentAnnotationComponent>
  mentionEntities: Map<string, Entity>
  mentionQuantities: Map<string, BatchMentionQuantity>
}): BatchAnnotationItem {
  const { row, batchRole, fixed, mentionEntities, mentionQuantities } = input
  const key = mentionKey(row.mention)
  const chosenEntity = mentionEntities.get(key) ?? null
  const chosenQuantity = mentionQuantities.get(key) ?? null
  const chosenComp = chosenEntity
    ? row.component
    : chosenQuantity
      ? withMentionQuantity(row.component, chosenQuantity)
      : row.component
  const subjectComp = batchRole === 'subject' ? chosenComp : fixed.subject
  const predicateComp = batchRole === 'predicate' ? chosenComp : fixed.predicate
  const objectComp = batchRole === 'object' ? chosenComp : fixed.object

  return {
    subject: subjectComp,
    subjectEntity: batchRole === 'subject'
      ? chosenEntity
      : subjectComp
        ? createEntityFromComponent(subjectComp)
        : null,
    predicate: predicateComp,
    predicateEntity: batchRole === 'predicate'
      ? chosenEntity
      : predicateComp
        ? createEntityFromComponent(predicateComp)
        : null,
    object: objectComp,
    objectEntity: batchRole === 'object'
      ? chosenEntity
      : objectComp
        ? createEntityFromComponent(objectComp)
        : null,
  }
}
