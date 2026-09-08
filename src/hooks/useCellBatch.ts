import type { Dispatch, SetStateAction } from 'react'
import type { usePopoverState, useSelectionState } from './useSelectionState'
import type { BatchAnnotationItem } from '@/actions/annotation/annotationActions'
import type { CellBatchCellRef, CellBatchPreview } from '@/lib/cell-batch'
import type { CurrentAnnotation, DocumentAnnotation, DocumentAnnotationComponent, EntityType } from '@/types/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import {
  addAnnotations,
  deleteAnnotations,
  getAnnotations,
} from '@/actions/annotation/annotationActions'
import { createEntityFromComponent } from '@/lib/annotation-roles'
import {
  buildCellBatchPreview,
  cellKey,
  cellsInRect,
  columnCellRefs,
  CONSTANT_ROLES,
  dedupeCellRefs,
} from '@/lib/cell-batch'
import { clearBrowserSelection } from './useSelectionState'

type ChipRect = {
  top: number
  left: number
  width: number
  height: number
}

type UseCellBatchOptions = {
  documentElements: Parameters<typeof buildCellBatchPreview>[0]['documentElements']
  documentAnnotations: DocumentAnnotation[]
  currentAnnotation: CurrentAnnotation | null
  setCurrentAnnotation: Dispatch<SetStateAction<CurrentAnnotation | null>>
  setDocumentAnnotations: Dispatch<SetStateAction<DocumentAnnotation[]>>
  selection: ReturnType<typeof useSelectionState>
  popover: ReturnType<typeof usePopoverState>
}

function getTableCellElement(elementIndex: number, row: number, col: number): HTMLElement | null {
  const container = document.getElementById(`element-${elementIndex}`)
  return container?.querySelector<HTMLElement>(`[data-cell="${row}-${col}"]`) ?? null
}

function findViewportForOrigin(origin: CellBatchCellRef): HTMLElement | null {
  const cellElement = getTableCellElement(origin.elementIndex, origin.row, origin.col)
  return cellElement?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? null
}

const AUTO_SCROLL_EDGE = 48
const AUTO_SCROLL_MAX_RATE = 16

const TOUCH_LONG_PRESS_MS = 450
const TOUCH_SLOP = 12

function computeAutoScrollRate(distance: number): number {
  const clamped = Math.max(Math.min(distance, AUTO_SCROLL_EDGE), 0)
  return Math.round((1 - clamped / AUTO_SCROLL_EDGE) * AUTO_SCROLL_MAX_RATE)
}

function getChipRectForCells(cells: CellBatchCellRef[]): ChipRect | null {
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

export function useCellBatch(options: UseCellBatchOptions) {
  const {
    documentElements,
    documentAnnotations,
    currentAnnotation,
    setCurrentAnnotation,
    setDocumentAnnotations,
    selection,
    popover,
  } = options

  const [cells, setCells] = useState<CellBatchCellRef[]>([])
  const [dragging, setDragging] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [cellRole, setCellRole] = useState<EntityType>('object')
  const [creating, setCreating] = useState(false)
  const [chipRect, setChipRect] = useState<ChipRect | null>(null)

  const anchorRef = useRef<CellBatchCellRef | null>(null)
  const dragRef = useRef<{ origin: CellBatchCellRef, focus: CellBatchCellRef | null, active: boolean } | null>(null)
  const modifierClickRef = useRef(false)
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

  const commitCells = useCallback((next: CellBatchCellRef[]) => {
    setCells(next)
    setChipRect(dragRef.current?.active || next.length < 2 ? null : getChipRectForCells(next))
  }, [])

  const clearCells = useCallback(() => {
    if (cells.length === 0) {
      return
    }
    anchorRef.current = null
    commitCells([])
  }, [cells, commitCells])

  const exitBatchMode = useCallback(() => {
    setBatchMode(false)
    setCellRole('object')
    clearCells()
  }, [clearCells])

  const openBatchMode = useCallback(() => {
    setBatchMode(true)
    popover.hidePopover()
  }, [popover])

  const toggleCell = useCallback((cell: CellBatchCellRef) => {
    const key = cellKey(cell)
    const exists = cells.some(candidate => cellKey(candidate) === key)
    const next = exists
      ? cells.filter(candidate => cellKey(candidate) !== key)
      : dedupeCellRefs([...cells, cell])
    anchorRef.current = cell
    commitCells(next)
  }, [cells, commitCells])

  const extendRect = useCallback((from: CellBatchCellRef, to: CellBatchCellRef) => {
    commitCells(cellsInRect(from, to))
  }, [commitCells])

  const selectColumn = useCallback((elementIndex: number, col: number) => {
    const element = documentElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData || tableData.length < 2) {
      toast.error('This column has no data rows to annotate.')
      return
    }
    const refs = columnCellRefs(elementIndex, tableData, col)
    anchorRef.current = refs[0] ?? null
    commitCells(refs)
  }, [commitCells, documentElements])

  const toggleColumn = useCallback((elementIndex: number, col: number) => {
    const element = documentElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    if (!tableData || tableData.length < 2) {
      return
    }
    const refs = columnCellRefs(elementIndex, tableData, col)
    const keys = new Set(refs.map(cellKey))
    const allSelected = refs.every(ref => cells.some(candidate => cellKey(candidate) === cellKey(ref)))
    const next = allSelected
      ? cells.filter(candidate => !keys.has(cellKey(candidate)))
      : dedupeCellRefs([...cells, ...refs])
    anchorRef.current = refs[0] ?? null
    commitCells(next)
  }, [cells, commitCells, documentElements])

  const handleCellMouseDown = useCallback((cell: CellBatchCellRef, event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    const anchor = anchorRef.current
    if (event.shiftKey && anchor && anchor.elementIndex === cell.elementIndex) {
      event.preventDefault()
      extendRect(anchor, cell)
      return
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      modifierClickRef.current = true
      toggleCell(cell)
      return
    }

    dragRef.current = { origin: cell, focus: null, active: false }
    pointerRef.current = null
    viewportRef.current = null
    setChipRect(null)
  }, [extendRect, toggleCell])

  const handleCellDragOver = useCallback((cell: CellBatchCellRef) => {
    const drag = dragRef.current
    if (!drag) {
      return
    }
    if (cellKey(cell) === cellKey(drag.origin)) {
      return
    }
    if (cell.elementIndex !== drag.origin.elementIndex) {
      return
    }
    if (drag.focus && cellKey(cell) === cellKey(drag.focus)) {
      return
    }

    drag.focus = cell
    if (!drag.active) {
      drag.active = true
      setDragging(true)
      viewportRef.current = findViewportForOrigin(drag.origin)
      clearBrowserSelection()
    }
    extendRect(drag.origin, cell)
  }, [extendRect])

  const handleCellMouseUp = useCallback((): boolean => {
    const drag = dragRef.current
    dragRef.current = null

    if (drag?.active) {
      anchorRef.current = drag.origin
      setDragging(false)
      setChipRect(cells.length >= 2 ? getChipRectForCells(cells) : null)
      return true
    }

    if (modifierClickRef.current) {
      modifierClickRef.current = false
      return true
    }

    if (!batchModeRef.current) {
      clearCells()
    }
    return false
  }, [cells, clearCells])

  const startPendingTouchGesture = useCallback((cell: CellBatchCellRef, event: React.PointerEvent<HTMLElement>) => {
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
      dragRef.current = { origin: cell, focus: null, active: true }
      pointerRef.current = { x: startX, y: startY }
      viewportRef.current = findViewportForOrigin(cell)
      setDragging(true)
      clearBrowserSelection()
      commitCells(cellsInRect(cell, cell))

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
  }, [commitCells])

  // Mouse and pen drags keep the direct-drag flow; touch drags start with a
  // long-press so one-finger scrolling on cells keeps working.
  const handleCellPointerDown = useCallback((cell: CellBatchCellRef, event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') {
      startPendingTouchGesture(cell, event)
      return
    }

    handleCellMouseDown(cell, event)
  }, [handleCellMouseDown, startPendingTouchGesture])

  const handleSelectColumn = useCallback((elementIndex: number, col: number, additive: boolean) => {
    if (additive) {
      toggleColumn(elementIndex, col)
    } else {
      selectColumn(elementIndex, col)
    }
    openBatchMode()
  }, [toggleColumn, selectColumn, openBatchMode])

  const handleAnnotateColumnFromPopover = useCallback((elementIndex: number, col: number) => {
    selectColumn(elementIndex, col)
    openBatchMode()
    selection.clearSelection()
  }, [openBatchMode, selectColumn, selection])

  const preview = useMemo<CellBatchPreview | null>(() => {
    if (!batchMode) {
      return null
    }

    const fixed = {
      subject: cellRole === 'subject' ? null : currentAnnotation?.subject ?? null,
      predicate: cellRole === 'predicate' ? null : currentAnnotation?.predicate ?? null,
      object: cellRole === 'object' ? null : currentAnnotation?.object ?? null,
    }

    return buildCellBatchPreview({
      cells,
      documentElements,
      cellRole,
      fixed,
      existingAnnotations: documentAnnotations,
      newId: uuidv4,
    })
  }, [batchMode, cells, documentElements, cellRole, currentAnnotation, documentAnnotations])

  const createBatch = useCallback(async (documentId: string) => {
    if (!preview || preview.createCount === 0 || creating) {
      return
    }

    const slots = {
      subject: currentAnnotation?.subject ?? null,
      predicate: currentAnnotation?.predicate ?? null,
      object: currentAnnotation?.object ?? null,
    }
    if (CONSTANT_ROLES[cellRole].some(role => !slots[role])) {
      return
    }

    const buildItem = (chosenComp: DocumentAnnotationComponent): BatchAnnotationItem => {
      const subjectComp = cellRole === 'subject' ? chosenComp : slots.subject!
      const predicateComp = cellRole === 'predicate' ? chosenComp : slots.predicate!
      const objectComp = cellRole === 'object' ? chosenComp : slots.object!
      return {
        subject: subjectComp,
        subjectEntity: cellRole === 'subject' ? null : createEntityFromComponent(subjectComp),
        predicate: predicateComp,
        predicateEntity: cellRole === 'predicate' ? null : createEntityFromComponent(predicateComp),
        object: objectComp,
        objectEntity: cellRole === 'object' ? null : createEntityFromComponent(objectComp),
      }
    }

    setCreating(true)
    try {
      const items = preview.rows
        .filter(row => row.status === 'create' && row.component)
        .map(row => buildItem(row.component!))

      const createdIds = await addAnnotations(documentId, items)
      const refreshed = await getAnnotations(documentId)
      setDocumentAnnotations(refreshed)

      exitBatchMode()
      setCurrentAnnotation(null)

      const created = createdIds.length
      toast.success(`${created} annotation${created > 1 ? 's' : ''} created!`, {
        description: preview.emptyCount > 0 || preview.duplicateCount > 0
          ? [
              preview.emptyCount > 0 ? `${preview.emptyCount} empty cell${preview.emptyCount > 1 ? 's' : ''} skipped` : null,
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
  }, [cellRole, preview, creating, currentAnnotation, exitBatchMode, setCurrentAnnotation, setDocumentAnnotations])

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
            const cell: CellBatchCellRef = { elementIndex: drag.origin.elementIndex, row, col }
            if (!drag.focus || cellKey(cell) !== cellKey(drag.focus)) {
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
        setDragging(false)
        clearBrowserSelection()
      }
      if (cells.length > 0) {
        exitBatchMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cells.length, exitBatchMode])

  useEffect(() => {
    const finalizeDrag = () => {
      const drag = dragRef.current
      if (drag?.active) {
        anchorRef.current = drag.origin
        setChipRect(cells.length >= 2 ? getChipRectForCells(cells) : null)
      }
      dragRef.current = null
      setDragging(false)
    }

    const handleWindowMouseUp = () => {
      finalizeDrag()
    }

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || event.pointerId !== activeTouchPointerIdRef.current) {
        return
      }
      activeTouchCleanupRef.current?.()
      finalizeDrag()
    }

    // The system claimed the touch (e.g. a system gesture): abort the
    // selection instead of finalizing it.
    const handleWindowPointerCancel = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || event.pointerId !== activeTouchPointerIdRef.current) {
        return
      }
      activeTouchCleanupRef.current?.()
      finalizeDrag()
      clearCells()
    }

    window.addEventListener('mouseup', handleWindowMouseUp)
    window.addEventListener('pointerup', handleWindowPointerUp)
    window.addEventListener('pointercancel', handleWindowPointerCancel)
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp)
      window.removeEventListener('pointerup', handleWindowPointerUp)
      window.removeEventListener('pointercancel', handleWindowPointerCancel)
    }
  }, [cells, clearCells])

  useEffect(() => {
    return () => {
      pendingTouchCleanupRef.current?.()
      activeTouchCleanupRef.current?.()
    }
  }, [])

  const selectedKeys = useMemo(() => new Set(cells.map(cellKey)), [cells])

  return {
    cells,
    selectedKeys,
    dragging,
    batchMode,
    cellRole,
    setCellRole,
    creating,
    preview,
    chipRect,
    openBatchMode,
    exitBatchMode,
    handleCellPointerDown,
    handleCellDragOver,
    handleCellMouseUp,
    handleSelectColumn,
    handleAnnotateColumnFromPopover,
    createBatch,
    clearCells,
  } as const
}
