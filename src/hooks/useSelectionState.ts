import type { DocumentAnnotationComponent, DocumentElement, EntityType, TextOrTableElement } from '@/types/types'
import type { PopoverState } from './useAnnotationState'
import { selectionIsBackwards, selectionIsEmpty } from '@/lib/utils'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

export function useSelectionState(
  combinedElements: TextOrTableElement[],
  documentElements: DocumentElement[],
  setPopoverState: (state: PopoverState | ((prev: PopoverState) => PopoverState)) => void,
  setCurrentAnnotation: (annotation: any) => void,
) {
  const [selectedOffset, setSelectedOffset] = useState({ start: 0, end: 0 })
  const [currentElementIndex, setCurrentElementIndex] = useState<number | null>(null)
  const [tableSelection, setTableSelection] = useState<{ rowIndex: number, cellIndex: number } | null>(null)

  const handleTextSelection = useCallback((index: number) => {
    setCurrentElementIndex(index)

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0)
      return

    const range = selection.getRangeAt(0)
    if (range.collapsed)
      return

    // Get the start and end nodes
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer
    const endNode = range.endContainer.nodeType === Node.TEXT_NODE
      ? range.endContainer.parentElement
      : range.endContainer

    // Get the start and end offsets from the closest elements with data attributes
    const startElement = startNode instanceof Element
      ? startNode.closest('[data-start]')
      : startNode?.parentElement?.closest('[data-start]')
    const endElement = endNode instanceof Element
      ? endNode.closest('[data-start]')
      : endNode?.parentElement?.closest('[data-start]')

    if (!startElement || !endElement)
      return

    // Calculate the absolute offsets
    const start = Number.parseInt(startElement.getAttribute('data-start') || '0', 10) + range.startOffset
    const end = Number.parseInt(endElement.getAttribute('data-start') || '0', 10) + range.endOffset

    // Handle backwards selection
    const finalStart = Math.min(start, end)
    const finalEnd = Math.max(start, end)

    setSelectedOffset({ start: finalStart, end: finalEnd })

    const rect = range.getBoundingClientRect()
    setPopoverState({
      top: rect.top + window.scrollY - 80,
      left: rect.left + window.scrollX,
      annotation: null,
      componentId: null,
      visible: true,
    })
  }, [setPopoverState])

  const handleTableSelection = useCallback((index: number, rowIndex: number, cellIndex: number) => {
    setCurrentElementIndex(index)
    setTableSelection({ rowIndex, cellIndex })

    const selection = window.getSelection()
    if (!selection)
      return

    // Check if there's an active text selection within the cell
    if (!selectionIsEmpty(selection) && selection.rangeCount > 0) {
      // User has selected specific text within the cell - use that selection
      const range = selection.getRangeAt(0)

      // Find the closest elements with data-start attributes
      const startContainer = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer as Element
      const endContainer = range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endContainer.parentElement
        : range.endContainer as Element

      const startElement = startContainer?.closest('[data-start]')
      const endElement = endContainer?.closest('[data-start]')

      if (startElement && endElement) {
        // Calculate relative offsets within the cell
        let start = Number.parseInt(startElement.getAttribute('data-start') || '0', 10) + range.startOffset
        let end = Number.parseInt(endElement.getAttribute('data-start') || '0', 10) + range.endOffset

        if (selectionIsBackwards(selection)) {
          [start, end] = [end, start]
        }

        setSelectedOffset({ start, end })

        // Show popup at the selection
        const rect = range.getBoundingClientRect()
        setPopoverState(prev => ({
          ...prev,
          top: rect.top + window.scrollY - 80,
          left: rect.left + window.scrollX,
          annotation: null,
          visible: true,
        }))
        return
      }
    }

    // No text selection - select the entire cell content
    const tableData = documentElements[index]?.value as string[][]
    if (tableData && tableData[rowIndex] && tableData[rowIndex][cellIndex]) {
      const cellContent = tableData[rowIndex][cellIndex]
      setSelectedOffset({ start: 0, end: cellContent.length })

      // Clear any existing selection to avoid confusion
      selection.removeAllRanges()

      // Show selection popup at the cell location
      setTimeout(() => {
        const cellElement = window.document.querySelector(`[data-cell="${rowIndex}-${cellIndex}"]`)
        if (cellElement) {
          const rect = cellElement.getBoundingClientRect()
          setPopoverState(prev => ({
            ...prev,
            top: rect.top + window.scrollY - 80,
            left: rect.left + window.scrollX + rect.width / 2,
            annotation: null,
            visible: true,
          }))
        } else {
          // Fallback: show popup at a reasonable position
          setPopoverState(prev => ({
            ...prev,
            top: window.scrollY + 200,
            left: window.scrollX + window.innerWidth / 2,
            annotation: null,
            visible: true,
          }))
        }
      }, 100)
    }
  }, [documentElements, setPopoverState])

  const createAnnotationComponent = useCallback((type: EntityType): DocumentAnnotationComponent | null => {
    if (currentElementIndex === null)
      return null

    const currentElementType = combinedElements[currentElementIndex].type
    if (currentElementType === 'table' && !tableSelection)
      return null

    let value = ''
    if (currentElementType === 'text') {
      value = documentElements[currentElementIndex].value as string
    } else if (currentElementType === 'table' && tableSelection) {
      value = (documentElements[currentElementIndex].value as string[][])[tableSelection.rowIndex][tableSelection.cellIndex]
    }

    // Extract the selected text and trim whitespace
    const selectedText = value.slice(selectedOffset.start, selectedOffset.end)
    const trimmedText = selectedText.trim()

    if (!trimmedText) {
      toast.error('Please select some text to annotate.')
      return null
    }

    // Calculate the actual start and end positions after trimming
    const leadingWhitespace = selectedText.length - selectedText.trimStart().length
    const trailingWhitespace = selectedText.length - selectedText.trimEnd().length
    const actualStart = selectedOffset.start + leadingWhitespace
    const actualEnd = selectedOffset.end - trailingWhitespace

    return {
      id: uuidv4(),
      entityLabel: null,
      entityValue: null,
      entityCustomId: null,
      entityCustom: null,
      entityDatatype: null,
      annotationStart: actualStart,
      annotationEnd: actualEnd,
      annotationRow: tableSelection?.rowIndex ?? null,
      annotationCell: tableSelection?.cellIndex ?? null,
      annotationValue: trimmedText,
      annotationType: currentElementType,
      annotationTag: type,
      elementIndex: currentElementIndex,
    }
  }, [currentElementIndex, combinedElements, tableSelection, documentElements, selectedOffset])

  const addToCurrentAnnotation = useCallback((type: EntityType) => {
    const newComponent = createAnnotationComponent(type)
    if (!newComponent)
      return

    setCurrentAnnotation((prev: any) => ({
      ...prev,
      [type]: newComponent,
    }))

    // Clear selection
    window.getSelection()?.removeAllRanges()
  }, [createAnnotationComponent, setCurrentAnnotation])

  return {
    selectedOffset,
    currentElementIndex,
    tableSelection,
    handleTextSelection,
    handleTableSelection,
    addToCurrentAnnotation,
  }
}
