import type { AnnotationMention, DocumentAnnotation, DocumentElement } from '@/types/types'
import { useCallback, useMemo, useRef, useState } from 'react'
import { selectionIsEmpty } from '@/lib/utils'

export type PopoverState = {
  top: number
  left: number
  annotation: DocumentAnnotation | null
  componentId: string | undefined | null
  visible: boolean
  annotations: DocumentAnnotation[]
  mentionData: AnnotationMention | null
}

const INITIAL_POPOVER_STATE: PopoverState = {
  top: 0,
  left: 0,
  annotation: null,
  componentId: null,
  visible: false,
  annotations: [],
  mentionData: null,
}

export type SelectionOffset = {
  start: number
  end: number
}

export type TableSelection = {
  rowIndex: number
  cellIndex: number
}

const SELECTION_TIMEOUT = 100

function getClosestElementWithDataStart(element: Element | null): Element | null {
  return element?.closest('[data-start]') || null
}

function getSelectionRange(): Range | null {
  const selection = window.getSelection()
  return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
}

function calculateAbsoluteOffset(element: Element | null, offset: number): number {
  if (!element)
    return offset
  const dataStart = element.getAttribute('data-start')
  return Number.parseInt(dataStart || '0', 10) + offset
}

function getRectFromRange(range: Range) {
  try {
    return range.getBoundingClientRect()
  } catch {
    return new DOMRect(0, 0, 0, 0)
  }
}

function clearBrowserSelection() {
  try {
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }
  } catch (error) {
    console.warn('Error clearing selections:', error)
  }
}

export function useSelectionState() {
  const [selectedOffset, setSelectedOffset] = useState<SelectionOffset>({ start: 0, end: 0 })
  const [currentElementIndex, setCurrentElementIndex] = useState<number | null>(null)
  const [tableSelection, setTableSelection] = useState<TableSelection | null>(null)

  const clearSelection = useCallback(() => {
    setSelectedOffset({ start: 0, end: 0 })
    setCurrentElementIndex(null)
    setTableSelection(null)
    clearBrowserSelection()
  }, [])

  const hasSelection = useCallback(() => {
    return currentElementIndex !== null && selectedOffset.start !== selectedOffset.end
  }, [currentElementIndex, selectedOffset])

  const isValidSelection = useMemo(() => {
    return hasSelection() && selectedOffset.start >= 0 && selectedOffset.end > selectedOffset.start
  }, [hasSelection, selectedOffset])

  return {
    selectedOffset,
    setSelectedOffset,
    currentElementIndex,
    setCurrentElementIndex,
    tableSelection,
    setTableSelection,
    clearSelection,
    hasSelection,
    isValidSelection,
  } as const
}

export function usePopoverState() {
  const [popoverState, setPopoverState] = useState<PopoverState>(INITIAL_POPOVER_STATE)

  const hidePopover = useCallback(() => {
    setPopoverState(INITIAL_POPOVER_STATE)
  }, [])

  const showPopover = useCallback((config: Omit<PopoverState, 'visible'>) => {
    setPopoverState({
      ...config,
      visible: true,
    })
  }, [])

  const updatePopoverPosition = useCallback((top: number, left: number) => {
    setPopoverState(prev => ({ ...prev, top, left }))
  }, [])

  return {
    popoverState,
    setPopoverState,
    hidePopover,
    showPopover,
    updatePopoverPosition,
  } as const
}

function useTextSelectionHandler(
  selection: ReturnType<typeof useSelectionState>,
  popover: ReturnType<typeof usePopoverState>,
) {
  return useCallback((index: number) => {
    selection.setCurrentElementIndex(index)

    const range = getSelectionRange()
    if (!range || range.collapsed)
      return

    try {
      // Get container elements
      const startContainer = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer as Element
      const endContainer = range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endContainer.parentElement
        : range.endContainer as Element

      // Find elements with data-start attributes
      const startElement = getClosestElementWithDataStart(startContainer)
      const endElement = getClosestElementWithDataStart(endContainer)

      if (!startElement || !endElement)
        return

      // Calculate absolute offsets
      const start = calculateAbsoluteOffset(startElement, range.startOffset)
      const end = calculateAbsoluteOffset(endElement, range.endOffset)

      // Ensure proper order regardless of selection direction
      const finalStart = Math.min(start, end)
      const finalEnd = Math.max(start, end)

      if (finalStart === finalEnd)
        return // Empty selection

      selection.setSelectedOffset({ start: finalStart, end: finalEnd })

      // Show popover at selection
      const rect = getRectFromRange(range)
      popover.showPopover({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
        annotation: null,
        componentId: null,
        annotations: [],
        mentionData: null,
      })
    } catch (error) {
      console.warn('Error handling text selection:', error)
    }
  }, [selection, popover])
}

function useTableSelectionHandler(
  documentElements: DocumentElement[],
  selection: ReturnType<typeof useSelectionState>,
  popover: ReturnType<typeof usePopoverState>,
) {
  const timeoutRef = useRef<NodeJS.Timeout>(undefined)

  const handleTextSelectionInCell = useCallback((range: Range) => {
    // Get container elements
    const startContainer = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer as Element
    const endContainer = range.endContainer.nodeType === Node.TEXT_NODE
      ? range.endContainer.parentElement
      : range.endContainer as Element

    // Find elements with data-start attributes
    const startElement = getClosestElementWithDataStart(startContainer)
    const endElement = getClosestElementWithDataStart(endContainer)

    if (!startElement || !endElement)
      return false

    const startPos = calculateAbsoluteOffset(startElement, range.startOffset)
    const endPos = calculateAbsoluteOffset(endElement, range.endOffset)

    // Ensure proper order regardless of selection direction
    const start = Math.min(startPos, endPos)
    const end = Math.max(startPos, endPos)

    if (start === end)
      return false // Empty selection

    selection.setSelectedOffset({ start, end })

    // Show popover at selection
    const rect = getRectFromRange(range)
    popover.showPopover({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + rect.width / 2,
      annotation: null,
      componentId: null,
      annotations: [],
      mentionData: null,
    })

    return true
  }, [selection, popover])

  const handleFullCellSelection = useCallback((
    index: number,
    rowIndex: number,
    cellIndex: number,
  ) => {
    const tableData = documentElements[index]?.value as string[][]
    const cellContent = tableData?.[rowIndex]?.[cellIndex]

    if (!cellContent)
      return

    selection.setSelectedOffset({ start: 0, end: cellContent.length })

    // Clear browser selection to avoid issues
    clearBrowserSelection()

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Delayed popover positioning to ensure DOM is ready
    timeoutRef.current = setTimeout(() => {
      const cellElement = document.querySelector(`[data-cell="${rowIndex}-${cellIndex}"]`)

      if (cellElement) {
        const rect = cellElement.getBoundingClientRect()
        popover.showPopover({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX + rect.width / 2,
          annotation: null,
          componentId: null,
          annotations: [],
          mentionData: null,
        })
      }
    }, SELECTION_TIMEOUT)
  }, [documentElements, selection, popover])

  return useCallback((index: number, rowIndex: number, cellIndex: number) => {
    selection.setCurrentElementIndex(index)
    selection.setTableSelection({ rowIndex, cellIndex })

    const domSelection = window.getSelection()
    if (!domSelection)
      return

    // Check for text selection within the cell
    if (!selectionIsEmpty(domSelection) && domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0)
      const handledTextSelection = handleTextSelectionInCell(range)
      if (handledTextSelection)
        return
    }

    // Fall back to full cell selection
    handleFullCellSelection(index, rowIndex, cellIndex)
  }, [selection, handleTextSelectionInCell, handleFullCellSelection])
}

export function useSelectionHandlers(
  documentElements: DocumentElement[],
  selection: ReturnType<typeof useSelectionState>,
  popover: ReturnType<typeof usePopoverState>,
) {
  const handleTextSelection = useTextSelectionHandler(selection, popover)
  const handleTableSelection = useTableSelectionHandler(documentElements, selection, popover)

  const memoizedHandlers = useMemo(() => ({
    handleTextSelection,
    handleTableSelection,
  }), [handleTextSelection, handleTableSelection])

  return memoizedHandlers
}
