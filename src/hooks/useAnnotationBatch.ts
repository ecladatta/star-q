import type { Dispatch, SetStateAction } from 'react'
import type { usePopoverState } from './useSelectionState'
import type { BatchAnnotationItem, BatchCellRef, BatchMention, BatchMentionQuantity, BatchPreview, BatchPreviewRow } from '@/lib/batch-mentions'
import type { CurrentAnnotation, DocumentAnnotation, DocumentAnnotationComponent, Entity, EntityType, TextOrTableElement, UnitRef } from '@/types/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  addAnnotations,
  deleteAnnotations,
  getAnnotations,
} from '@/actions/annotation/annotationActions'
import { createEntityFromComponent } from '@/lib/annotation-roles'
import {
  allCellRefs,
  buildBatchAnnotationItem,
  buildBatchPreview,
  cellsInRect,
  columnCellRefs,
  CONSTANT_ROLES,
  dedupeMentions,
  materializeBatchMentionQuantity,
  mentionKey,
  rectContainsCell,
  rowCellRefs,
  spanMentionComponent,
  spanRefFromComponent,
  trimmedCellValue,
} from '@/lib/batch-mentions'
import { clearBrowserSelection } from './useSelectionState'

type AnchorRect = {
  top: number
  left: number
  width: number
  height: number
}

export type BatchOriginRect = AnchorRect

type UseAnnotationBatchOptions = {
  rawElements: TextOrTableElement[]
  documentAnnotations: DocumentAnnotation[]
  currentAnnotation: CurrentAnnotation | null
  setCurrentAnnotation: Dispatch<SetStateAction<CurrentAnnotation | null>>
  setDocumentAnnotations: Dispatch<SetStateAction<DocumentAnnotation[]>>
  popover: ReturnType<typeof usePopoverState>
}

function getTableCellElement(elementIndex: number, row: number, col: number): HTMLElement | null {
  const container = document.getElementById(`element-${elementIndex}`)
  return container?.querySelector<HTMLElement>(`[data-cell="${row}-${col}"]`) ?? null
}

function findViewportForOrigin(origin: BatchCellRef): HTMLElement | null {
  const cellElement = getTableCellElement(origin.elementIndex, origin.row, origin.col)
  return cellElement?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? null
}

function nextEmptyRole(currentAnnotation: CurrentAnnotation | null): EntityType {
  const roles: EntityType[] = ['subject', 'predicate', 'object']
  return roles.find(role => !currentAnnotation?.[role]) ?? 'subject'
}

const AUTO_SCROLL_EDGE = 48
const AUTO_SCROLL_MAX_RATE = 16

const TOUCH_LONG_PRESS_MS = 450
const TOUCH_SLOP = 12

function computeAutoScrollRate(distance: number): number {
  const clamped = Math.max(Math.min(distance, AUTO_SCROLL_EDGE), 0)
  return Math.round((1 - clamped / AUTO_SCROLL_EDGE) * AUTO_SCROLL_MAX_RATE)
}

function withoutKey<K, V>(map: Map<K, V>, key: K): Map<K, V> {
  if (!map.has(key)) {
    return map
  }
  const next = new Map(map)
  next.delete(key)
  return next
}

function getAnchorRectForCells(cells: BatchCellRef[]): AnchorRect | null {
  let top = Number.POSITIVE_INFINITY
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  for (const cell of cells) {
    const element = getTableCellElement(cell.elementIndex, cell.row, cell.col)
    if (!element) {
      continue
    }
    const rect = element.getBoundingClientRect()
    top = Math.min(top, rect.top + window.scrollY)
    left = Math.min(left, rect.left + window.scrollX)
    right = Math.max(right, rect.right + window.scrollX)
    bottom = Math.max(bottom, rect.bottom + window.scrollY)
  }

  if (top === Number.POSITIVE_INFINITY) {
    return null
  }

  return {
    top,
    left,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
  }
}

export function useAnnotationBatch(options: UseAnnotationBatchOptions) {
  const {
    rawElements,
    documentAnnotations,
    currentAnnotation,
    setCurrentAnnotation,
    setDocumentAnnotations,
    popover,
  } = options

  const [mentions, setMentions] = useState<BatchMention[]>([])
  const [dragging, setDragging] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedRole, setSelectedRole] = useState<EntityType>('subject')
  const [creating, setCreating] = useState(false)
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null)
  const [mentionEntities, setMentionEntities] = useState<Map<string, Entity>>(() => new Map())
  const [mentionQuantities, setMentionQuantities] = useState<Map<string, BatchMentionQuantity>>(() => new Map())
  const [batchQuantity, setBatchQuantity] = useState<BatchMentionQuantity | null>(null)

  const mentionKeySet = useMemo(() => new Set(mentions.map(mentionKey)), [mentions])

  const resetMentionValues = useCallback(() => {
    setMentionEntities(new Map())
    setMentionQuantities(new Map())
    setBatchQuantity(null)
  }, [])

  const setMentionEntity = useCallback((mention: BatchMention, entity: Entity | null) => {
    const key = mentionKey(mention)
    setMentionEntities((prev) => {
      const next = new Map(prev)
      if (entity) {
        next.set(key, entity)
      } else {
        next.delete(key)
      }
      return next
    })
    if (entity) {
      setMentionQuantities(prev => withoutKey(prev, key))
    }
  }, [])

  const setMentionQuantity = useCallback((mention: BatchMention, quantity: { value: string, lowerBound: string, upperBound: string } | null) => {
    const key = mentionKey(mention)
    if (quantity) {
      setMentionQuantities((prev) => {
        const next = new Map(prev)
        next.set(key, { ...quantity, unit: prev.get(key)?.unit ?? null })
        return next
      })
      setMentionEntities(prev => withoutKey(prev, key))
    } else {
      setMentionQuantities(prev => withoutKey(prev, key))
    }
  }, [])

  const setMentionQuantityUnit = useCallback((mention: BatchMention, unitRef: UnitRef | null) => {
    const key = mentionKey(mention)
    setMentionQuantities((prev) => {
      const next = new Map(prev)
      const existing = prev.get(key)
      if (!existing && !unitRef) {
        return prev
      }
      next.set(key, {
        value: existing?.value ?? '',
        lowerBound: existing?.lowerBound ?? '',
        upperBound: existing?.upperBound ?? '',
        unit: unitRef,
      })
      return next
    })
    if (unitRef) {
      setMentionEntities(prev => withoutKey(prev, key))
    }
  }, [])

  const anchorRef = useRef<BatchCellRef | null>(null)

  type DragState = {
    origin: BatchCellRef
    focus: BatchCellRef | null
    active: boolean
  } & (
    | { mode: 'plain' }
    | { mode: 'toggle', selecting: boolean }
  )

  const dragRef = useRef<DragState | null>(null)
  const modifierClickRef = useRef(false)
  const dragActiveInSequenceRef = useRef(false)
  const batchModeRef = useRef(false)
  const pointerRef = useRef<{ x: number, y: number } | null>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const autoScrollRafRef = useRef<number | undefined>(undefined)
  const pendingTouchCleanupRef = useRef<(() => void) | null>(null)
  const activeTouchCleanupRef = useRef<(() => void) | null>(null)
  const activeTouchPointerIdRef = useRef<number | null>(null)
  const touchMoveBlockRef = useRef<((event: TouchEvent) => void) | null>(null)
  const touchStyledCellRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    batchModeRef.current = batchMode
  }, [batchMode])

  useEffect(() => {
    if (!dragging) {
      return
    }

    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.userSelect = previousUserSelect
    }
  }, [dragging])

  const commitMentions = useCallback((next: BatchMention[], showAnchor = true) => {
    resetMentionValues()
    setMentions(next)
    if (dragRef.current?.active || next.length < 2) {
      setAnchorRect(null)
    } else if (showAnchor) {
      setAnchorRect(getAnchorRectForCells(next.filter(mention => mention.kind === 'cell')))
    } else {
      setAnchorRect(prev => (prev === null ? null : getAnchorRectForCells(next.filter(mention => mention.kind === 'cell'))))
    }
  }, [resetMentionValues])

  const commitStagedMentions = useCallback((next: BatchMention[], originRect: BatchOriginRect | null) => {
    resetMentionValues()
    setMentions(next)
    if (dragRef.current?.active || next.length < 2) {
      setAnchorRect(null)
      return
    }
    setAnchorRect(originRect ?? getAnchorRectForCells(next.filter(mention => mention.kind === 'cell')))
  }, [resetMentionValues])

  const clearMentions = useCallback(() => {
    if (mentions.length === 0) {
      return
    }
    anchorRef.current = null
    commitMentions([])
  }, [mentions, commitMentions])

  const exitBatchMode = useCallback(() => {
    setBatchMode(false)
    setSelectedRole('subject')
    clearMentions()
    setCurrentAnnotation(null)
  }, [clearMentions, setCurrentAnnotation])

  const releaseMentions = useCallback(() => {
    setBatchMode(false)
    setSelectedRole('subject')
    clearMentions()
    resetMentionValues()
  }, [clearMentions, resetMentionValues])

  const setBatchRole = useCallback((type: EntityType) => {
    setSelectedRole(type)
    setCurrentAnnotation(prev => (prev?.[type] ? { ...prev, [type]: undefined } : prev))
  }, [setCurrentAnnotation])

  const openBatchMode = useCallback(() => {
    setBatchMode(true)
    popover.hidePopover()
  }, [popover])

  const stageSpanBatch = useCallback((input: {
    role: EntityType
    stagedComponent: DocumentAnnotationComponent | null
    foldedComponent: DocumentAnnotationComponent | null
  }) => {
    if (creating) {
      return
    }
    const staged = input.stagedComponent
      ? spanRefFromComponent(input.stagedComponent, rawElements[input.stagedComponent.elementIndex])
      : null
    if (!staged) {
      return
    }

    if (batchMode && selectedRole === input.role) {
      // Append keeps per-mention assignments; only starting a batch resets.
      setMentions(prev => dedupeMentions([...prev, staged]))
      popover.hidePopover()
      return
    }

    const nextMentions: BatchMention[] = []
    const seededEntities = new Map<string, Entity>()
    const seededQuantities = new Map<string, BatchMentionQuantity>()
    const foldedComponent = input.foldedComponent
    const folded = foldedComponent
      ? spanRefFromComponent(foldedComponent, rawElements[foldedComponent.elementIndex])
      : null
    if (folded && foldedComponent && mentionKey(folded) !== mentionKey(staged)) {
      nextMentions.push(folded)
      const entity = createEntityFromComponent(foldedComponent)
      if (entity) {
        seededEntities.set(mentionKey(folded), entity)
      } else if (
        foldedComponent.entityValue !== null
        || foldedComponent.quantityLowerBound !== null
        || foldedComponent.quantityUpperBound !== null
        || foldedComponent.unit !== null
      ) {
        seededQuantities.set(mentionKey(folded), {
          value: foldedComponent.entityValue ?? '',
          lowerBound: foldedComponent.quantityLowerBound ?? '',
          upperBound: foldedComponent.quantityUpperBound ?? '',
          unit: foldedComponent.unit,
        })
      }
    }
    nextMentions.push(staged)

    resetMentionValues()
    setMentionEntities(seededEntities)
    setMentionQuantities(seededQuantities)
    setMentions(nextMentions)
    setSelectedRole(input.role)
    setCurrentAnnotation(prev => (prev?.[input.role] ? { ...prev, [input.role]: undefined } : prev))
    setBatchMode(true)
    // Spans highlight inline through the components map; no floating anchor.
    setAnchorRect(null)
    popover.hidePopover()
  }, [creating, rawElements, batchMode, selectedRole, resetMentionValues, setCurrentAnnotation, popover])

  const toggleCell = useCallback((cell: BatchCellRef) => {
    const key = mentionKey(cell)
    const exists = mentionKeySet.has(key)
    const next = exists
      ? mentions.filter(candidate => mentionKey(candidate) !== key)
      : dedupeMentions([...mentions, cell])
    anchorRef.current = cell
    commitMentions(next, false)
  }, [mentions, mentionKeySet, commitMentions])

  const spreadToggle = useCallback((from: BatchCellRef, to: BatchCellRef, selecting: boolean) => {
    resetMentionValues()
    setMentions((prev) => {
      if (!selecting) {
        return prev.filter(candidate => candidate.kind !== 'cell' || !rectContainsCell(from, to, candidate))
      }
      return dedupeMentions([...prev, ...cellsInRect(from, to)])
    })
    setAnchorRect(null)
  }, [resetMentionValues])

  const extendRect = useCallback((from: BatchCellRef, to: BatchCellRef) => {
    commitMentions(cellsInRect(from, to))
  }, [commitMentions])

  const selectColumn = useCallback((elementIndex: number, col: number, originRect: BatchOriginRect | null = null) => {
    dragRef.current = null
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData || tableData.length < 2) {
      toast.error('This column has no data rows to annotate.')
      return 0
    }
    const refs = columnCellRefs(elementIndex, tableData, col)
    anchorRef.current = refs[0] ?? null
    commitStagedMentions(refs, originRect)
    return refs.length
  }, [commitStagedMentions, rawElements])

  const toggleColumn = useCallback((elementIndex: number, col: number, originRect: BatchOriginRect | null = null) => {
    dragRef.current = null
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData || tableData.length < 2) {
      return
    }
    const refs = columnCellRefs(elementIndex, tableData, col)
    const keys = new Set(refs.map(mentionKey))
    const allSelected = refs.every(ref => mentionKeySet.has(mentionKey(ref)))
    const next = allSelected
      ? mentions.filter(candidate => !keys.has(mentionKey(candidate)))
      : dedupeMentions([...mentions, ...refs])
    anchorRef.current = refs[0] ?? null
    if (allSelected) {
      commitMentions(next)
    } else {
      commitStagedMentions(next, originRect)
    }
  }, [mentions, mentionKeySet, commitMentions, commitStagedMentions, rawElements])

  const selectRow = useCallback((elementIndex: number, row: number, originRect: BatchOriginRect | null = null) => {
    dragRef.current = null
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData?.[row]) {
      toast.error('This row has no cells to annotate.')
      return 0
    }
    const refs = rowCellRefs(elementIndex, tableData, row)
    anchorRef.current = refs[0] ?? null
    commitStagedMentions(refs, originRect)
    return refs.length
  }, [commitStagedMentions, rawElements])

  const toggleRow = useCallback((elementIndex: number, row: number, originRect: BatchOriginRect | null = null) => {
    dragRef.current = null
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData?.[row]) {
      return
    }
    const refs = rowCellRefs(elementIndex, tableData, row)
    const keys = new Set(refs.map(mentionKey))
    const allSelected = refs.every(ref => mentionKeySet.has(mentionKey(ref)))
    const next = allSelected
      ? mentions.filter(candidate => !keys.has(mentionKey(candidate)))
      : dedupeMentions([...mentions, ...refs])
    anchorRef.current = refs[0] ?? null
    if (allSelected) {
      commitMentions(next)
    } else {
      commitStagedMentions(next, originRect)
    }
  }, [mentions, mentionKeySet, commitMentions, commitStagedMentions, rawElements])

  const selectAll = useCallback((elementIndex: number, originRect: BatchOriginRect | null = null) => {
    dragRef.current = null
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData || tableData.length < 2) {
      toast.error('This table has no data rows to annotate.')
      return 0
    }
    const refs = allCellRefs(elementIndex, tableData)
    anchorRef.current = refs[0] ?? null
    commitStagedMentions(refs, originRect)
    return refs.length
  }, [commitStagedMentions, rawElements])

  const toggleAll = useCallback((elementIndex: number, originRect: BatchOriginRect | null = null) => {
    dragRef.current = null
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData) {
      return
    }
    const refs = allCellRefs(elementIndex, tableData)
    const keys = new Set(refs.map(mentionKey))
    const allSelected = refs.length > 0
      && refs.every(ref => mentionKeySet.has(mentionKey(ref)))
    const next = allSelected
      ? mentions.filter(candidate => !keys.has(mentionKey(candidate)))
      : dedupeMentions([...mentions, ...refs])
    anchorRef.current = refs[0] ?? null
    if (allSelected) {
      commitMentions(next)
    } else {
      commitStagedMentions(next, originRect)
    }
  }, [mentions, mentionKeySet, commitMentions, commitStagedMentions, rawElements])

  const handleCellMouseDown = useCallback((cell: BatchCellRef, event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const isModifierClick = event.ctrlKey || event.metaKey
    if (!isModifierClick && modifierClickRef.current) {
      // Canceling the modifier click's pointerdown suppresses its
      // compatibility mouseup, so the flag was never consumed. Clear it
      // or it would swallow this plain click.
      modifierClickRef.current = false
    }
    dragActiveInSequenceRef.current = false

    const interactiveTarget = event.target instanceof Element
      && event.target.closest('[role="button"]')
    if (interactiveTarget && interactiveTarget !== event.currentTarget) {
      return
    }

    const anchor = anchorRef.current
    if (event.shiftKey && anchor && anchor.elementIndex === cell.elementIndex) {
      event.preventDefault()
      popover.hidePopover()
      extendRect(anchor, cell)
      return
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      popover.hidePopover()
      const selecting = !mentionKeySet.has(mentionKey(cell))
      modifierClickRef.current = true
      dragRef.current = { origin: cell, focus: null, active: false, mode: 'toggle', selecting }
      toggleCell(cell)
      return
    }

    dragRef.current = { origin: cell, focus: null, active: false, mode: 'plain' }
    pointerRef.current = null
    viewportRef.current = null
    setAnchorRect(null)
  }, [extendRect, toggleCell, popover, mentionKeySet])

  const handleCellDragOver = useCallback((cell: BatchCellRef) => {
    const drag = dragRef.current
    if (!drag) {
      return
    }
    if (mentionKey(cell) === mentionKey(drag.origin)) {
      return
    }
    if (cell.elementIndex !== drag.origin.elementIndex) {
      return
    }
    if (drag.focus && mentionKey(cell) === mentionKey(drag.focus)) {
      return
    }

    drag.focus = cell
    if (!drag.active) {
      drag.active = true
      setDragging(true)
      viewportRef.current = findViewportForOrigin(drag.origin)
      clearBrowserSelection()
      popover.hidePopover()
    }
    if (drag.mode === 'toggle') {
      spreadToggle(drag.origin, cell, drag.selecting)
      return
    }
    extendRect(drag.origin, cell)
  }, [extendRect, popover, spreadToggle])

  const handleCellMouseUp = useCallback((cell?: BatchCellRef): boolean => {
    if (dragActiveInSequenceRef.current) {
      dragActiveInSequenceRef.current = false
      return true
    }

    if (modifierClickRef.current) {
      modifierClickRef.current = false
      return true
    }

    if (!batchModeRef.current) {
      const clickedSelected = cell !== undefined
        && mentionKeySet.has(mentionKey(cell))
      if (clickedSelected) {
        setAnchorRect(getAnchorRectForCells(mentions.filter(mention => mention.kind === 'cell')))
        return true
      }
      clearMentions()
    }
    return false
  }, [mentions, mentionKeySet, clearMentions])

  const startPendingTouchGesture = useCallback((cell: BatchCellRef, event: React.PointerEvent<HTMLElement>) => {
    pendingTouchCleanupRef.current?.()
    pendingTouchCleanupRef.current = null

    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const gesture: { teardown: () => void } = { teardown: () => {} }

    // Tap or scroll intent: cancel the pending gesture. Taps keep the
    // standard single-cell flow via compatibility mouse events; scroll
    // intents keep native scrolling (we never blocked it).
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > TOUCH_SLOP) {
        gesture.teardown()
      }
    }
    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) {
        return
      }
      gesture.teardown()
    }
    const onCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) {
        return
      }
      gesture.teardown()
    }

    const removePendingListeners = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }

    const timer = window.setTimeout(() => {
      removePendingListeners()

      // Long-press activation: the touch gesture becomes a range selection
      // anchored at the pressed cell. Subsequent moves extend it (the rAF
      // loop hit-tests the pointer position) and touch scrolling is blocked
      // so the pan gesture belongs to the selection.
      activeTouchPointerIdRef.current = pointerId
      dragRef.current = { origin: cell, focus: null, active: true, mode: 'plain' }
      pointerRef.current = { x: startX, y: startY }
      viewportRef.current = findViewportForOrigin(cell)
      setDragging(true)
      clearBrowserSelection()
      commitMentions(cellsInRect(cell, cell))

      const cellElement = getTableCellElement(cell.elementIndex, cell.row, cell.col)
      if (cellElement) {
        cellElement.style.setProperty('-webkit-user-select', 'none')
        cellElement.style.setProperty('-webkit-touch-callout', 'none')
        touchStyledCellRef.current = cellElement
      }

      const block = (touchEvent: TouchEvent) => {
        if (activeTouchPointerIdRef.current !== null) {
          touchEvent.preventDefault()
        }
      }
      window.addEventListener('touchmove', block, { passive: false })
      touchMoveBlockRef.current = block

      activeTouchCleanupRef.current = () => {
        if (touchMoveBlockRef.current) {
          window.removeEventListener('touchmove', touchMoveBlockRef.current)
          touchMoveBlockRef.current = null
        }
        if (touchStyledCellRef.current) {
          touchStyledCellRef.current.style.removeProperty('-webkit-user-select')
          touchStyledCellRef.current.style.removeProperty('-webkit-touch-callout')
          touchStyledCellRef.current = null
        }
        activeTouchPointerIdRef.current = null
        activeTouchCleanupRef.current = null
      }
    }, TOUCH_LONG_PRESS_MS)

    gesture.teardown = () => {
      window.clearTimeout(timer)
      removePendingListeners()
      pendingTouchCleanupRef.current = null
    }
    pendingTouchCleanupRef.current = () => gesture.teardown()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }, [commitMentions])

  // Mouse and pen drags keep the direct-drag flow; touch drags start with a
  // long-press so one-finger scrolling on mentions keeps working.
  const handleCellPointerDown = useCallback((cell: BatchCellRef, event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') {
      startPendingTouchGesture(cell, event)
      return
    }

    handleCellMouseDown(cell, event)
  }, [handleCellMouseDown, startPendingTouchGesture])

  const isColumnSelected = useCallback((elementIndex: number, col: number) => {
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData || tableData.length < 2) {
      return false
    }
    const refs = columnCellRefs(elementIndex, tableData, col)
    return refs.length > 0 && refs.every(ref => mentionKeySet.has(mentionKey(ref)))
  }, [mentionKeySet, rawElements])

  const isRowSelected = useCallback((elementIndex: number, row: number) => {
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData?.[row]) {
      return false
    }
    const refs = rowCellRefs(elementIndex, tableData, row)
    return refs.length > 0 && refs.every(ref => mentionKeySet.has(mentionKey(ref)))
  }, [mentionKeySet, rawElements])

  const isAllSelected = useCallback((elementIndex: number) => {
    const element = rawElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData || tableData.length < 2) {
      return false
    }
    const refs = allCellRefs(elementIndex, tableData)
    return refs.length > 0 && refs.every(ref => mentionKeySet.has(mentionKey(ref)))
  }, [mentionKeySet, rawElements])

  const handleSelectColumn = useCallback((elementIndex: number, col: number, additive: boolean, originRect: BatchOriginRect | null = null) => {
    if (!additive && isColumnSelected(elementIndex, col)) {
      if (currentAnnotation) {
        releaseMentions()
      } else {
        exitBatchMode()
      }
      return
    }
    if (!additive) {
      const selectedCount = selectColumn(elementIndex, col, originRect)
      if (selectedCount >= 2) {
        // Multi-cell selections wait unclaimed; claiming a role opens batch mode.
        setBatchMode(false)
      } else {
        setBatchRole(nextEmptyRole(currentAnnotation))
        openBatchMode()
      }
    } else {
      toggleColumn(elementIndex, col, originRect)
    }
  }, [isColumnSelected, releaseMentions, exitBatchMode, selectColumn, setBatchRole, openBatchMode, toggleColumn, currentAnnotation])

  const handleSelectRow = useCallback((elementIndex: number, row: number, additive: boolean, originRect: BatchOriginRect | null = null) => {
    if (!additive && isRowSelected(elementIndex, row)) {
      if (currentAnnotation) {
        releaseMentions()
      } else {
        exitBatchMode()
      }
      return
    }
    if (!additive) {
      const selectedCount = selectRow(elementIndex, row, originRect)
      if (selectedCount >= 2) {
        // Multi-cell selections wait unclaimed; claiming a role opens batch mode.
        setBatchMode(false)
      } else {
        setBatchRole(nextEmptyRole(currentAnnotation))
        openBatchMode()
      }
    } else {
      toggleRow(elementIndex, row, originRect)
    }
  }, [isRowSelected, releaseMentions, exitBatchMode, selectRow, setBatchRole, openBatchMode, toggleRow, currentAnnotation])

  const handleSelectAll = useCallback((elementIndex: number, additive: boolean, originRect: BatchOriginRect | null = null) => {
    if (!additive && isAllSelected(elementIndex)) {
      if (currentAnnotation) {
        releaseMentions()
      } else {
        exitBatchMode()
      }
      return
    }
    if (!additive) {
      const selectedCount = selectAll(elementIndex, originRect)
      if (selectedCount >= 2) {
        // Multi-cell selections wait unclaimed; claiming a role opens batch mode.
        setBatchMode(false)
      } else {
        setBatchRole(nextEmptyRole(currentAnnotation))
        openBatchMode()
      }
    } else {
      toggleAll(elementIndex, originRect)
    }
  }, [isAllSelected, releaseMentions, exitBatchMode, selectAll, setBatchRole, openBatchMode, toggleAll, currentAnnotation])

  const preview = useMemo<BatchPreview | null>(() => {
    if (!batchMode) {
      return null
    }

    const fixed = {
      subject: selectedRole === 'subject' ? null : currentAnnotation?.subject ?? null,
      predicate: selectedRole === 'predicate' ? null : currentAnnotation?.predicate ?? null,
      object: selectedRole === 'object' ? null : currentAnnotation?.object ?? null,
    }

    return buildBatchPreview({
      mentions,
      rawElements,
      batchRole: selectedRole,
      fixed,
      existingAnnotations: documentAnnotations,
    })
  }, [batchMode, mentions, rawElements, selectedRole, currentAnnotation, documentAnnotations])

  const stagedSpanComponents = useMemo(() => {
    if (!batchMode) {
      return []
    }
    return dedupeMentions(mentions).flatMap(mention =>
      mention.kind === 'span' ? [spanMentionComponent(mention, selectedRole)] : [])
  }, [batchMode, mentions, selectedRole])

  const stagedSpanIds = useMemo(
    () => new Set(stagedSpanComponents.map(component => component.id)),
    [stagedSpanComponents],
  )

  const createBatch = useCallback(async (documentId: string) => {
    if (!preview || preview.createCount === 0 || creating) {
      return
    }

    const slots = {
      subject: currentAnnotation?.subject ?? null,
      predicate: currentAnnotation?.predicate ?? null,
      object: currentAnnotation?.object ?? null,
    }
    const hasFixedSlots = (candidate: typeof slots): candidate is Record<EntityType, DocumentAnnotationComponent> =>
      CONSTANT_ROLES[selectedRole].every(role => candidate[role] !== null)
    if (!hasFixedSlots(slots)) {
      return
    }

    const buildItem = (row: BatchPreviewRow & { component: DocumentAnnotationComponent }): BatchAnnotationItem =>
      buildBatchAnnotationItem({ row, batchRole: selectedRole, fixed: slots, mentionEntities, mentionQuantities })

    setCreating(true)
    try {
      const items = preview.rows
        .filter((row): row is BatchPreviewRow & { component: DocumentAnnotationComponent } =>
          row.status === 'create' && row.component !== null)
        .map(row => buildItem(row))

      const createdIds = await addAnnotations(documentId, items)
      try {
        const refreshed = await getAnnotations(documentId)
        setDocumentAnnotations(refreshed)
      } catch {
        // Creation succeeded
      }

      exitBatchMode()

      const created = createdIds.length
      toast.success(`${created} annotation${created > 1 ? 's' : ''} created!`, {
        description: preview.emptyCount > 0 || preview.duplicateCount > 0
          ? [
              preview.emptyCount > 0 ? `${preview.emptyCount} empty selection${preview.emptyCount > 1 ? 's' : ''} skipped` : null,
              preview.duplicateCount > 0 ? `${preview.duplicateCount} duplicate${preview.duplicateCount > 1 ? 's' : ''} skipped` : null,
            ].filter(Boolean).join(' · ')
          : undefined,
        action: {
          label: 'Undo',
          onClick: () => {
            void deleteAnnotations(createdIds).then(() => {
              setDocumentAnnotations(prev => prev.filter(annotation => !createdIds.includes(annotation.id)))
              toast.success('Batch creation undone')
            }).catch((error) => {
              toast.error(`Failed to undo: ${(error as Error)?.message || 'Unknown error'}`)
            })
          },
        },
        duration: 10000,
      })
    } catch (error) {
      toast.error(`Failed to create annotations: ${(error as Error)?.message || 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
  }, [selectedRole, preview, creating, currentAnnotation, mentionEntities, mentionQuantities, exitBatchMode, setDocumentAnnotations])

  useEffect(() => {
    if (!dragging) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
    }

    const frame = () => {
      const pointer = pointerRef.current
      const drag = dragRef.current

      if (pointer && drag?.active) {
        const viewport = viewportRef.current
        const innerScrollable = Boolean(
          viewport && viewport.scrollHeight > viewport.clientHeight + 1,
        )

        if (innerScrollable && viewport) {
          const rect = viewport.getBoundingClientRect()
          let dy = 0
          let dx = 0
          if (pointer.y < rect.top + AUTO_SCROLL_EDGE) {
            dy = -computeAutoScrollRate(pointer.y - rect.top)
          } else if (pointer.y > rect.bottom - AUTO_SCROLL_EDGE) {
            dy = computeAutoScrollRate(rect.bottom - pointer.y)
          }
          if (pointer.x < rect.left + AUTO_SCROLL_EDGE) {
            dx = -computeAutoScrollRate(pointer.x - rect.left)
          } else if (pointer.x > rect.right - AUTO_SCROLL_EDGE) {
            dx = computeAutoScrollRate(rect.right - pointer.x)
          }
          if (dy !== 0) {
            viewport.scrollTop += dy
          }
          if (dx !== 0) {
            viewport.scrollLeft += dx
          }
        } else {
          let dy = 0
          let dx = 0
          if (pointer.y < AUTO_SCROLL_EDGE) {
            dy = -computeAutoScrollRate(pointer.y)
          } else if (pointer.y > window.innerHeight - AUTO_SCROLL_EDGE) {
            dy = computeAutoScrollRate(window.innerHeight - pointer.y)
          }
          if (pointer.x < AUTO_SCROLL_EDGE) {
            dx = -computeAutoScrollRate(pointer.x)
          } else if (pointer.x > window.innerWidth - AUTO_SCROLL_EDGE) {
            dx = computeAutoScrollRate(window.innerWidth - pointer.x)
          }
          if (dy !== 0 || dx !== 0) {
            window.scrollBy(dx, dy)
          }
        }

        // Auto-scrolling under a stationary pointer doesn't fire mouseenter,
        // so keep extending the selection to the cell revealed at the pointer.
        const hit = document.elementFromPoint(pointer.x, pointer.y)
          ?.closest<HTMLElement>('[data-cell]')
        if (hit && hit.closest(`#element-${drag.origin.elementIndex}`)) {
          const [row, col] = (hit.getAttribute('data-cell') || '').split('-').map(Number)
          if (Number.isFinite(row) && Number.isFinite(col)) {
            const cell: BatchCellRef = { kind: 'cell', elementIndex: drag.origin.elementIndex, row, col }
            if (!drag.focus || mentionKey(cell) !== mentionKey(drag.focus)) {
              drag.focus = cell
              extendRect(drag.origin, cell)
            }
          }
        }
      }

      autoScrollRafRef.current = requestAnimationFrame(frame)
    }

    window.addEventListener('pointermove', handlePointerMove)
    autoScrollRafRef.current = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (autoScrollRafRef.current !== undefined) {
        cancelAnimationFrame(autoScrollRafRef.current)
      }
    }
  }, [dragging, extendRect])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (dragRef.current?.active) {
        activeTouchCleanupRef.current?.()
        dragRef.current = null
        dragActiveInSequenceRef.current = false
        setDragging(false)
        clearBrowserSelection()
      }
      if (mentions.length > 0) {
        // With an in-progress annotation, defer to the form's discard
        // confirmation (its close button is triggered by the keyboard
        // shortcuts' Escape handler). Exit immediately otherwise.
        if (!currentAnnotation) {
          exitBatchMode()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mentions.length, currentAnnotation, exitBatchMode])

  useEffect(() => {
    const finalizeDrag = (releasedOnTouch: boolean) => {
      const drag = dragRef.current
      dragRef.current = null
      if (drag?.active) {
        anchorRef.current = drag.origin
        dragActiveInSequenceRef.current = true
        setDragging(false)

        if (releasedOnTouch && mentions.length === 1) {
          setBatchRole(nextEmptyRole(currentAnnotation))
          openBatchMode()
          return
        }

        setAnchorRect(mentions.length >= 2 ? getAnchorRectForCells(mentions.filter(mention => mention.kind === 'cell')) : null)
        return
      }
      setDragging(false)
    }

    const handleWindowPointerUp = (event: PointerEvent) => {
      // Ctrl/cmd drags suppress the compat mouseup, so pointerup is the
      // single finalization path for every pointer type.
      if (event.pointerType === 'touch' && event.pointerId !== activeTouchPointerIdRef.current) {
        return
      }
      activeTouchCleanupRef.current?.()
      finalizeDrag(event.pointerType === 'touch')
    }

    // The system claimed the touch (e.g. a system gesture): abort the
    // selection instead of finalizing it.
    const handleWindowPointerCancel = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || event.pointerId !== activeTouchPointerIdRef.current) {
        return
      }
      activeTouchCleanupRef.current?.()
      finalizeDrag(false)
      clearMentions()
    }

    window.addEventListener('pointerup', handleWindowPointerUp, true)
    window.addEventListener('pointercancel', handleWindowPointerCancel, true)
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp, true)
      window.removeEventListener('pointercancel', handleWindowPointerCancel, true)
    }
  }, [mentions, clearMentions, currentAnnotation, openBatchMode, setBatchRole])

  useEffect(() => {
    return () => {
      pendingTouchCleanupRef.current?.()
      activeTouchCleanupRef.current?.()
    }
  }, [])

  const mentionRows = useMemo(() => {
    return dedupeMentions(mentions).map((mention) => {
      if (mention.kind === 'span') {
        return { mention, text: mention.value, filled: true }
      }
      const element = rawElements[mention.elementIndex]
      const tableData = element?.type === 'table' ? element.value as string[][] : undefined
      const cellText = tableData?.[mention.row]?.[mention.col]
      const value = typeof cellText === 'string' ? trimmedCellValue(cellText) : null

      return {
        mention,
        text: value?.value ?? '',
        filled: Boolean(value),
      }
    })
  }, [mentions, rawElements])

  const applyBatchQuantity = useCallback((shared: BatchMentionQuantity) => {
    setBatchQuantity(shared)
    setMentionQuantities((prev) => {
      const next = new Map(prev)
      for (const row of mentionRows) {
        if (!row.filled) {
          continue
        }
        next.set(mentionKey(row.mention), materializeBatchMentionQuantity({ text: row.text, shared }))
      }
      return next
    })
    setMentionEntities((prev) => {
      if (mentionRows.every(row => !row.filled || !prev.has(mentionKey(row.mention)))) {
        return prev
      }
      const next = new Map(prev)
      for (const row of mentionRows) {
        if (row.filled) {
          next.delete(mentionKey(row.mention))
        }
      }
      return next
    })
  }, [mentionRows])

  const clearBatchQuantity = useCallback(() => {
    setBatchQuantity(null)
  }, [])

  return {
    mentions,
    mentionKeySet,
    stagedSpanComponents,
    stagedSpanIds,
    dragging,
    batchMode,
    batchRole: selectedRole,
    setBatchRole,
    creating,
    preview,
    anchorRect,
    mentionEntities,
    setMentionEntity,
    mentionQuantities,
    setMentionQuantity,
    setMentionQuantityUnit,
    batchQuantity,
    applyBatchQuantity,
    clearBatchQuantity,
    mentionRows,
    stageSpanBatch,
    openBatchMode,
    exitBatchMode,
    releaseMentions,
    handleCellPointerDown,
    handleCellDragOver,
    handleCellMouseUp,
    handleSelectColumn,
    handleSelectRow,
    handleSelectAll,
    createBatch,
    clearMentions,
  } as const
}
