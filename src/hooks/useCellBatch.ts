import type { Dispatch, SetStateAction } from 'react'
import type { usePopoverState, useSelectionState } from './useSelectionState'
import type { CellBatchCellRef, CellBatchOffset, CellBatchPreview } from '@/lib/cell-batch'
import type { CurrentAnnotation, DocumentAnnotation, Entity } from '@/types/types'
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
  const [capturedOffset, setCapturedOffset] = useState<CellBatchOffset | null>(null)
  const [objectOffset, setObjectOffset] = useState<CellBatchOffset | null>(null)
  const [creating, setCreating] = useState(false)
  const [chipRect, setChipRect] = useState<ChipRect | null>(null)

  const anchorRef = useRef<CellBatchCellRef | null>(null)
  const dragRef = useRef<{ origin: CellBatchCellRef, focus: CellBatchCellRef | null, active: boolean } | null>(null)
  const modifierClickRef = useRef(false)
  const batchModeRef = useRef(false)

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
    setObjectOffset(null)
    setCapturedOffset(null)
    clearCells()
  }, [clearCells])

  const openBatchMode = useCallback((offset: CellBatchOffset | null) => {
    setCapturedOffset(offset)
    setObjectOffset(offset)
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

  const handleSelectColumn = useCallback((elementIndex: number, col: number, additive: boolean) => {
    if (additive) {
      toggleColumn(elementIndex, col)
    } else {
      selectColumn(elementIndex, col)
    }
    openBatchMode(null)
  }, [toggleColumn, selectColumn, openBatchMode])

  const handleAnnotateColumnFromPopover = useCallback((elementIndex: number, col: number) => {
    const element = documentElements[elementIndex]
    const tableData = element?.type === 'table' ? element.value as string[][] : undefined
    const anchorCell = tableData?.[selection.tableSelection?.rowIndex ?? -1]?.[col]

    let offset: CellBatchOffset | null = null
    const { start, end } = selection.selectedOffset
    if (typeof anchorCell === 'string' && !(start === 0 && end === anchorCell.length)) {
      offset = { start, end }
    }

    selectColumn(elementIndex, col)
    openBatchMode(offset)
    selection.clearSelection()
  }, [documentElements, openBatchMode, selectColumn, selection])

  const preview = useMemo<CellBatchPreview | null>(() => {
    if (!batchMode) {
      return null
    }

    return buildCellBatchPreview({
      cells,
      documentElements,
      offset: objectOffset,
      subject: currentAnnotation?.subject ?? null,
      predicate: currentAnnotation?.predicate ?? null,
      existingAnnotations: documentAnnotations,
      newId: uuidv4,
    })
  }, [batchMode, cells, documentElements, objectOffset, currentAnnotation, documentAnnotations])

  const createBatch = useCallback(async (documentId: string) => {
    if (!preview || preview.createCount === 0 || creating) {
      return
    }

    const subject = currentAnnotation?.subject
    const predicate = currentAnnotation?.predicate
    if (!subject || !predicate) {
      return
    }

    setCreating(true)
    try {
      const subjectEntity: Entity = createEntityFromComponent(subject)
      const predicateEntity: Entity = createEntityFromComponent(predicate)
      const items = preview.rows
        .filter(row => row.status === 'create' && row.object)
        .map(row => ({
          subject,
          subjectEntity,
          predicate,
          predicateEntity,
          object: row.object!,
        }))

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
  }, [preview, creating, currentAnnotation, exitBatchMode, setCurrentAnnotation, setDocumentAnnotations])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (dragRef.current?.active) {
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
    const handleWindowMouseUp = () => {
      const drag = dragRef.current
      if (drag?.active) {
        anchorRef.current = drag.origin
        setChipRect(cells.length >= 2 ? getChipRectForCells(cells) : null)
      }
      dragRef.current = null
      setDragging(false)
    }

    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => window.removeEventListener('mouseup', handleWindowMouseUp)
  }, [cells])

  const selectedKeys = useMemo(() => new Set(cells.map(cellKey)), [cells])

  return {
    cells,
    selectedKeys,
    dragging,
    batchMode,
    capturedOffset,
    objectOffset,
    setObjectOffset,
    creating,
    preview,
    chipRect,
    openBatchMode,
    exitBatchMode,
    handleCellMouseDown,
    handleCellDragOver,
    handleCellMouseUp,
    handleSelectColumn,
    handleAnnotateColumnFromPopover,
    createBatch,
    clearCells,
  } as const
}
