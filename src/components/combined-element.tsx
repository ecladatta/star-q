'use client'
import type { Offset } from '@/lib/utils'
import type { AnnotationComponentRole, CurrentAnnotation, DocumentElement, EntityType } from '@/types/types'
import { Check, Columns3Icon, Copy, Grid2x2Check, Rows3Icon } from 'lucide-react'
import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getAnnotationComponents } from '@/lib/annotation-roles'
import { cn, splitWithOffsets } from '@/lib/utils'
import Split from './split'

const ROLE_COLOR_VAR: Record<AnnotationComponentRole, string> = {
  'subject': 'var(--subject-soft)',
  'predicate': 'var(--predicate-soft)',
  'object': 'var(--object-soft)',
  'qualifier-predicate': 'var(--qualifier-soft)',
  'qualifier-value': 'var(--qualifier-soft)',
}

export type CombinedElementProps = {
  elementIndex: number
  value: string | string[][]
  type: 'text' | 'table'
  data: { title: string, level?: number }
  handleTextSelection: (index: number, selectionContainer: Element, textSource?: string) => void
  handleTableSelection: (index: number, row: number, cell: number) => void
  handleTableCellPointerDown?: (index: number, row: number, col: number, event: React.PointerEvent<HTMLElement>) => void
  handleTableCellDragOver?: (index: number, row: number, col: number) => void
  handleTableCellMouseUp?: (index: number, row: number, col: number) => void
  handleSplitClick: (split: Offset, anchorRect?: DOMRect) => void
  documentElements: DocumentElement[]
  currentAnnotation: CurrentAnnotation | null
  selectedCellKeys?: Set<string>
  cellRole?: EntityType
  onSelectColumn?: (col: number, additive: boolean) => void
  onSelectRow?: (row: number, additive: boolean) => void
  onSelectAll?: (additive: boolean) => void
  readOnly?: boolean
}

const ROLE_SELECTED_CELL: Record<EntityType, string> = {
  subject: 'bg-subject-soft/60! ring-subject/60!',
  predicate: 'bg-predicate-soft/60! ring-predicate/60!',
  object: 'bg-object-soft/60! ring-object/60!',
}

function isComponentFromCurrentAnnotation(componentId: string, currentAnnotation: CurrentAnnotation | null): boolean {
  if (!currentAnnotation)
    return false
  return getAnnotationComponents(currentAnnotation).some(component => component.id === componentId)
}

function normalizeRenderedWhitespace(text: string | null | undefined) {
  return (text ?? '').replace(/[\u00A0\u202F]/g, ' ')
}

const COLUMN_BUTTON_SIZE = 24
const COLUMN_BUTTON_GAP = 4
const COLUMN_BUTTON_HOVER_ZONE = 40
const ROW_BUTTON_SIZE = 24
const ROW_BUTTON_GAP = 4
const ROW_BUTTON_HOVER_ZONE = 40

type ColumnButtonPosition = { top: number, left: number }
type RowButtonPosition = { top: number, left: number }
type TableActionRailPosition = { top: number, left: number }

function getComponentRole(
  componentId: string | undefined,
  element: DocumentElement,
  currentAnnotation: CurrentAnnotation | null,
): AnnotationComponentRole | undefined {
  const component = element.components.find(annotation => annotation.id === componentId)
    ?? (currentAnnotation
      ? getAnnotationComponents(currentAnnotation).find(annotation => annotation.id === componentId)
      : undefined)

  return component?.annotationTag
}

function CombinedElement({
  elementIndex,
  value,
  type,
  data,
  handleTextSelection,
  handleTableSelection,
  handleTableCellPointerDown,
  handleTableCellDragOver,
  handleTableCellMouseUp,
  handleSplitClick,
  documentElements,
  currentAnnotation,
  selectedCellKeys,
  cellRole,
  onSelectColumn,
  onSelectRow,
  onSelectAll,
  readOnly = false,
}: CombinedElementProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number, cell: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [columnButtonPosition, setColumnButtonPosition] = useState<ColumnButtonPosition | null>(null)
  const [rowButtonPosition, setRowButtonPosition] = useState<RowButtonPosition | null>(null)
  const [tableActionRailPosition, setTableActionRailPosition] = useState<TableActionRailPosition | null>(null)

  const tableRootRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)
  const hoveredHeaderRef = useRef<number | null>(null)
  const hoveredRowRef = useRef<number | null>(null)
  const columnButtonRef = useRef<HTMLButtonElement | null>(null)
  const rowButtonRef = useRef<HTMLButtonElement | null>(null)

  const updateColumnButtonPosition = useCallback((cellIndex: number | null) => {
    const wrapper = tableWrapperRef.current
    const viewport = wrapper?.querySelector<HTMLElement>('[data-slot=scroll-area-viewport]')

    if (!wrapper || !viewport || cellIndex === null) {
      setColumnButtonPosition(null)
      return
    }

    const head = wrapper.querySelector<HTMLElement>(`[data-cell="0-${cellIndex}"]`)
    if (!head) {
      setColumnButtonPosition(null)
      return
    }

    const wrapperRect = wrapper.getBoundingClientRect()
    const headRect = head.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const viewportLeft = viewportRect.left - wrapperRect.left
    const headerCenter = headRect.left + headRect.width / 2 - wrapperRect.left
    const minLeft = viewportLeft + COLUMN_BUTTON_GAP + COLUMN_BUTTON_SIZE / 2
    const maxLeft = viewportLeft + viewportRect.width - COLUMN_BUTTON_GAP - COLUMN_BUTTON_SIZE / 2

    setColumnButtonPosition({
      top: -COLUMN_BUTTON_GAP,
      left: Math.max(minLeft, Math.min(maxLeft, headerCenter)),
    })
  }, [])

  const updateTableActionRailPosition = useCallback(() => {
    const wrapper = tableWrapperRef.current
    const viewport = wrapper?.querySelector<HTMLElement>('[data-slot=scroll-area-viewport]')

    if (!wrapper || !viewport) {
      setTableActionRailPosition(null)
      return
    }

    const wrapperRect = wrapper.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const viewportTop = viewportRect.top - wrapperRect.top
    const viewportLeft = viewportRect.left - wrapperRect.left

    setTableActionRailPosition({
      top: viewportTop + COLUMN_BUTTON_GAP,
      left: viewportLeft + viewportRect.width + COLUMN_BUTTON_GAP,
    })
  }, [])

  const updateRowButtonPosition = useCallback((row: number | null) => {
    const wrapper = tableWrapperRef.current
    const viewport = wrapper?.querySelector<HTMLElement>('[data-slot=scroll-area-viewport]')

    if (!wrapper || !viewport || row === null) {
      setRowButtonPosition(null)
      return
    }

    const firstCell = wrapper.querySelector<HTMLElement>(`[data-cell="${row}-0"]`)
    if (!firstCell) {
      setRowButtonPosition(null)
      return
    }

    const wrapperRect = wrapper.getBoundingClientRect()
    const cellRect = firstCell.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const viewportTop = viewportRect.top - wrapperRect.top
    const viewportLeft = viewportRect.left - wrapperRect.left
    const minTop = viewportTop + ROW_BUTTON_GAP
    const maxTop = viewportTop + viewportRect.height - ROW_BUTTON_GAP - ROW_BUTTON_SIZE
    const cellCenter = cellRect.top + cellRect.height / 2 - wrapperRect.top

    setRowButtonPosition({
      top: Math.max(minTop, Math.min(maxTop, cellCenter - ROW_BUTTON_SIZE / 2)),
      left: viewportLeft - ROW_BUTTON_GAP - ROW_BUTTON_SIZE,
    })
  }, [])

  useEffect(() => {
    const tableWrapper = tableWrapperRef.current
    const updateFromHoveredHeader = () => updateColumnButtonPosition(hoveredHeaderRef.current)
    const updateFromHoveredRow = () => updateRowButtonPosition(hoveredRowRef.current)
    const updateAll = () => {
      updateFromHoveredHeader()
      updateFromHoveredRow()
      updateTableActionRailPosition()
    }

    updateAll()
    tableWrapper?.addEventListener('scroll', updateAll, { capture: true, passive: true })
    window.addEventListener('resize', updateAll)

    const resizeObserver = new ResizeObserver(updateAll)
    if (tableWrapper) {
      resizeObserver.observe(tableWrapper)
    }

    return () => {
      tableWrapper?.removeEventListener('scroll', updateAll, { capture: true })
      window.removeEventListener('resize', updateAll)
      resizeObserver.disconnect()
    }
  }, [updateColumnButtonPosition, updateRowButtonPosition, updateTableActionRailPosition])

  const copyTableAsMarkdown = (tableData: string[][]) => {
    const markdown = tableData.map((row, rowIndex) => {
      const cells = row.map(cell => cell.replace(/\|/g, '\\|'))
      const rowMarkdown = `| ${cells.join(' | ')} |`

      if (rowIndex === 0) {
        const separator = `| ${cells.map(() => '---').join(' | ')} |`
        return `${rowMarkdown}\n${separator}`
      }

      return rowMarkdown
    }).join('\n')

    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(setCopied, 2000, false)
    })

    toast.success('Table copied to clipboard as Markdown!')
  }

  const element = documentElements[elementIndex]
  if (!element) {
    return null
  }

  if (type === 'text') {
    const rawText = value as string
    const renderedText = normalizeRenderedWhitespace(rawText)
    const rawTitle = data.title ?? ''
    const renderedTitle = normalizeRenderedWhitespace(rawTitle)

    const isHeadingComponent = (component: DocumentElement['components'][number]) =>
      component.annotationType === 'text'
      && rawTitle.slice(component.annotationStart, component.annotationEnd) === component.annotationValue
      && rawText.slice(component.annotationStart, component.annotationEnd) !== component.annotationValue

    const currentAnnotationComponents = currentAnnotation
      ? getAnnotationComponents(currentAnnotation)
          .filter(component => component.elementIndex === elementIndex)
      : []

    const toOffset = (component: DocumentElement['components'][number]) => ({
      start: component.annotationStart,
      end: component.annotationEnd,
      row: component.annotationRow ?? undefined,
      cell: component.annotationCell ?? undefined,
      componentId: component.id,
    })

    const headingSplits = splitWithOffsets(
      renderedTitle,
      'text',
      element.components.filter(isHeadingComponent).map(toOffset),
      currentAnnotationComponents.filter(isHeadingComponent).map(toOffset),
    )

    const splits = splitWithOffsets(
      renderedText,
      'text',
      element.components.filter(component => !isHeadingComponent(component)).map(toOffset),
      currentAnnotationComponents.filter(component => !isHeadingComponent(component)).map(toOffset),
    )

    const headingProps = renderedTitle
      ? {
          className: 'mb-2 font-semibold wrap-break-word select-text',
          ...{
            'data-start': 0,
            'data-end': renderedTitle.length,
          },
          ...(!readOnly && {
            onMouseUp: (event: React.MouseEvent<HTMLElement>) =>
              handleTextSelection(elementIndex, event.currentTarget, rawTitle),
          }),
        }
      : {
          className: 'mb-2 font-semibold wrap-break-word',
        }

    const headingContent = renderedTitle
      ? headingSplits
          .filter(split => split.source === 'text')
          .map(split => (
            <Split
              key={`heading-split-${split.componentId}-${split.start}-${split.end}`}
              {...split}
              className="wrap-break-word"
              onClick={anchorRect => handleSplitClick(split, anchorRect)}
              role={getComponentRole(split.componentId, element, currentAnnotation)}
              isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
            />
          ))
      : renderedTitle

    return (
      <div key={elementIndex} className="mb-4 min-w-0" id={`element-${elementIndex}`}>
        {createElement(data.level ? `h${data.level}` : 'div', headingProps, headingContent)}
        <div
          className="min-w-0 text-[15px]/7 wrap-break-word"
          {...(!readOnly && {
            onMouseUp: (event: React.MouseEvent<HTMLElement>) => handleTextSelection(elementIndex, event.currentTarget),
          })}
        >
          {splits
            .filter(split => split.source === 'text')
            .map(split => (
              <Split
                key={`text-split-${split.componentId}-${split.start}-${split.end}`}
                {...split}
                className="wrap-break-word"
                onClick={anchorRect => handleSplitClick(split, anchorRect)}
                role={getComponentRole(split.componentId, element, currentAnnotation)}
                isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
              />
            ))}
        </div>
      </div>
    )
  } else if (type === 'table') {
    const tableData = value as string[][]
    const renderedTableData = tableData.map(row => row.map(normalizeRenderedWhitespace))

    const handleTableRootMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
      const tableWrapper = tableWrapperRef.current

      if (!tableWrapper)
        return

      const zoneTarget = event.target instanceof Element
        && (Boolean(event.target.closest('[data-table-hover-zone]'))
          || Boolean(columnButtonRef.current?.contains(event.target))
          || Boolean(rowButtonRef.current?.contains(event.target)))

      const wrapperRect = tableWrapper.getBoundingClientRect()
      const inColumnZone = zoneTarget
        && event.clientY >= wrapperRect.top - COLUMN_BUTTON_HOVER_ZONE
        && event.clientY < wrapperRect.top
        && event.clientX >= wrapperRect.left - COLUMN_BUTTON_HOVER_ZONE
        && event.clientX <= wrapperRect.right + COLUMN_BUTTON_HOVER_ZONE

      if (!inColumnZone) {
        const insideTable = event.clientY >= wrapperRect.top
          && event.clientY <= wrapperRect.bottom
          && event.clientX >= wrapperRect.left
          && event.clientX <= wrapperRect.right

        if (!insideTable && hoveredHeaderRef.current !== null) {
          hoveredHeaderRef.current = null
          setColumnButtonPosition(null)

          if (hoveredRowRef.current === null)
            setHoveredCell(null)
        }
        return
      }

      const headerCells = Array.from(tableWrapper.querySelectorAll<HTMLElement>('[data-cell^="0-"]'))
      const headerIndex = headerCells.findIndex((header) => {
        const headerRect = header.getBoundingClientRect()

        return event.clientX >= headerRect.left && event.clientX <= headerRect.right
      })
      const nearestHeaderIndex = headerIndex !== -1
        ? headerIndex
        : headerCells.reduce((nearest, header, index, cells) => {
            const distance = Math.abs(header.getBoundingClientRect().left - event.clientX)
            const nearestDistance = Math.abs(cells[nearest].getBoundingClientRect().left - event.clientX)

            return distance < nearestDistance ? index : nearest
          }, 0)

      if (!headerCells[nearestHeaderIndex])
        return

      hoveredHeaderRef.current = nearestHeaderIndex
      setHoveredCell({ row: 0, cell: nearestHeaderIndex })
      updateColumnButtonPosition(nearestHeaderIndex)
      hoveredRowRef.current = null
      setRowButtonPosition(null)
    }

    const handleRowHoverZoneMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
      const tableWrapper = tableWrapperRef.current

      if (!tableWrapper)
        return

      const wrapperRect = tableWrapper.getBoundingClientRect()
      const inRowZone = event.clientX >= wrapperRect.left - ROW_BUTTON_HOVER_ZONE
        && event.clientX < wrapperRect.left
        && event.clientY >= wrapperRect.top
        && event.clientY <= wrapperRect.bottom

      if (!inRowZone)
        return

      let hoveredRow: number | null = null
      let nearestRow = -1
      let nearestDistance = Number.POSITIVE_INFINITY
      let previousRow = -1

      for (const cell of tableWrapper.querySelectorAll<HTMLElement>('[data-cell]')) {
        const row = Number.parseInt(cell.dataset.cell?.split('-')[0] ?? '', 10)

        if (!(row >= 0) || row === previousRow)
          continue

        previousRow = row
        const rowRect = cell.getBoundingClientRect()

        if (event.clientY >= rowRect.top && event.clientY <= rowRect.bottom) {
          hoveredRow = row
          break
        }

        const distance = Math.abs(rowRect.top + rowRect.height / 2 - event.clientY)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestRow = row
        }
      }

      if (hoveredRow === null && nearestRow >= 0)
        hoveredRow = nearestRow

      if (hoveredRow === null)
        return

      hoveredRowRef.current = hoveredRow
      setHoveredCell({ row: hoveredRow, cell: 0 })
      updateRowButtonPosition(hoveredRow)
      hoveredHeaderRef.current = null
      setColumnButtonPosition(null)
    }

    const isInRowHoverZone = (event: React.MouseEvent<HTMLElement>) => {
      const wrapperRect = tableWrapperRef.current?.getBoundingClientRect()

      return Boolean(wrapperRect)
        && event.clientX >= wrapperRect!.left - ROW_BUTTON_HOVER_ZONE
        && event.clientX < wrapperRect!.left
        && event.clientY >= wrapperRect!.top
        && event.clientY <= wrapperRect!.bottom
    }

    const splits = renderedTableData.map((row, rowIndex) =>
      row.map((cell, cellIndex) => {
        const cellAnnotations = element.components.filter(
          annotation => annotation.annotationRow === rowIndex && annotation.annotationCell === cellIndex,
        )

        const currentAnnotationOffsets = currentAnnotation
          ? getAnnotationComponents(currentAnnotation)
              .filter(component =>
                component
                && component.elementIndex === elementIndex
                && component.annotationRow === rowIndex
                && component.annotationCell === cellIndex,
              )
              .map(component => ({
                start: component.annotationStart,
                end: component.annotationEnd,
                id: component.id,
                componentId: component.id,
              }))
          : []

        return splitWithOffsets(
          cell,
          'table',
          cellAnnotations.map(annotation => ({
            start: annotation.annotationStart,
            end: annotation.annotationEnd,
            id: annotation.id,
            componentId: annotation.id,
          })),
          currentAnnotationOffsets,
        )
      }),
    )

    const handleCellMouseUp = (rowIndex: number, cellIndex: number) => {
      if (handleTableCellMouseUp) {
        handleTableCellMouseUp(elementIndex, rowIndex, cellIndex)
        return
      }

      // Fallback for consumers that don't compose cell-range selection
      setTimeout(() => {
        handleTableSelection(elementIndex, rowIndex, cellIndex)
      }, 50)
    }

    const handleCellPointerDown = (rowIndex: number, cellIndex: number, event: React.PointerEvent<HTMLElement>) => {
      handleTableCellPointerDown?.(elementIndex, rowIndex, cellIndex, event)
    }

    const handleCellDragOver = (rowIndex: number, cellIndex: number) => {
      handleTableCellDragOver?.(elementIndex, rowIndex, cellIndex)
    }

    const isCellSelected = (rowIndex: number, cellIndex: number) => {
      return selectedCellKeys?.has(`${elementIndex}:${rowIndex}:${cellIndex}`) ?? false
    }

    const handleHeaderMouseEnter = (cellIndex: number) => {
      hoveredHeaderRef.current = cellIndex
      hoveredRowRef.current = 0
      setHoveredCell({ row: 0, cell: cellIndex })
      updateColumnButtonPosition(cellIndex)
      updateRowButtonPosition(0)
    }

    const handleHeaderMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
      const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null

      if (relatedTarget
        && (columnButtonRef.current?.contains(relatedTarget) || rowButtonRef.current?.contains(relatedTarget))) {
        return
      }

      hoveredHeaderRef.current = null
      setHoveredCell(null)
      setColumnButtonPosition(null)
    }

    const handleRowCellEnter = (row: number, cell: number) => {
      hoveredRowRef.current = row
      hoveredHeaderRef.current = cell
      setHoveredCell({ row, cell })
      updateRowButtonPosition(row)
      updateColumnButtonPosition(cell)
    }

    const handleRowCellLeave = (event: React.MouseEvent<HTMLElement>) => {
      const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null

      if (!relatedTarget
        || rowButtonRef.current?.contains(relatedTarget)
        || columnButtonRef.current?.contains(relatedTarget)) {
        return
      }

      hoveredRowRef.current = null
      setHoveredCell(null)
      setRowButtonPosition(null)
      setColumnButtonPosition(null)
    }

    // Build the border style based on which components are present
    const borderLayers: string[] = []
    let borderOffset = 0
    const borderConfig = currentAnnotation
      ? getAnnotationComponents(currentAnnotation)
          .filter(component => component.elementIndex === elementIndex)
          .filter((component, index, components) =>
            components.findIndex(candidate => candidate.annotationTag === component.annotationTag) === index,
          )
          .map(component => ({ color: ROLE_COLOR_VAR[component.annotationTag] }))
      : []
    borderConfig.forEach(({ color }) => {
      if (borderOffset > 0) {
        borderLayers.push(`0 0 0 ${borderOffset + 1}px var(--background)`)
        borderOffset += 1
      }
      borderLayers.push(`0 0 0 ${borderOffset + 3}px ${color}`)
      borderOffset += 3
    })
    const boxShadowStyle = borderLayers.length > 0 ? borderLayers.join(', ') : undefined

    return (
      <div
        key={elementIndex}
        ref={tableRootRef}
        className="group mb-6 min-w-0"
        id={`element-${elementIndex}`}
        onMouseMove={handleTableRootMouseMove}
        onMouseLeave={(event) => {
          const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null

          if (!relatedTarget || !tableRootRef.current?.contains(relatedTarget)) {
            hoveredHeaderRef.current = null
            hoveredRowRef.current = null
            setHoveredCell(null)
            setColumnButtonPosition(null)
            setRowButtonPosition(null)
          }
        }}
      >
        <div className="relative z-10 mt-10 mb-2 flex min-w-0 items-center justify-between">
          {data.title && <div className="min-w-0 text-sm font-semibold wrap-break-word">{normalizeRenderedWhitespace(data.title)}</div>}
        </div>
        <div ref={tableWrapperRef} className="relative min-w-0 px-5 md:px-7 lg:px-0">
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200"
            style={{ boxShadow: boxShadowStyle }}
            onMouseEnter={event => event.stopPropagation()}
            onMouseLeave={event => event.stopPropagation()}
          />
          {!readOnly && onSelectRow && tableData.length > 1 && (
            <div
              aria-hidden="true"
              className="absolute top-0 -left-10 z-0 h-full w-[calc(100%+2.5rem)]"
              data-table-hover-zone="row"
              onMouseEnter={handleRowHoverZoneMouseMove}
              onMouseMove={handleRowHoverZoneMouseMove}
              onMouseLeave={(event) => {
                const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null

                if (!relatedTarget || !tableWrapperRef.current?.contains(relatedTarget)) {
                  hoveredRowRef.current = null
                  setHoveredCell(null)
                  setRowButtonPosition(null)
                }
              }}
            />
          )}
          {!readOnly && onSelectColumn && tableData.length > 1 && (
            <div
              aria-hidden="true"
              className="absolute -top-10 left-1/2 z-0 h-10 w-[calc(100%+5rem)] -translate-x-1/2"
              data-table-hover-zone="column"
              onMouseEnter={handleTableRootMouseMove}
              onMouseMove={handleTableRootMouseMove}
            />
          )}
          <div
            aria-hidden="true"
            className="absolute top-0 -right-10 z-0 h-full w-[calc(100%+2.5rem)]"
            data-table-hover-zone="actions"
          />
          <ScrollArea
            className="flex max-h-[60vh] w-full min-w-0 flex-col overflow-y-auto rounded-xl border transition-shadow duration-200"
            style={{ boxShadow: boxShadowStyle }}
          >
            <div className="relative **:data-[slot=table-container]:overflow-visible">
              <Table>
                <TableHeader className="bg-muted/50">
                  {splits.slice(0, 1).map(row => (
                    <TableRow key="table-header-row" className="hover:bg-muted/20">
                      {row.map((cellSplits, cellIndex) => {
                        const isHovered = hoveredCell?.row === 0 && hoveredCell?.cell === cellIndex
                        const isSelected = isCellSelected(0, cellIndex)

                        return (
                          <TableHead
                            // eslint-disable-next-line react/no-array-index-key
                            key={cellIndex}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              'group/head sticky top-0 z-10 bg-muted p-3 font-medium transition-colors duration-200 select-text first:rounded-tl-[11px] last:rounded-tr-[11px]',
                              isHovered ? 'bg-[color-mix(in_srgb,var(--accent)_10%,var(--muted))]! ring-1! ring-inset! ring-accent/40!' : 'hover:bg-[color-mix(in_srgb,var(--accent)_10%,var(--muted))]! hover:ring-1! hover:ring-inset! hover:ring-accent/40!',
                              isSelected && 'bg-[color-mix(in_srgb,var(--accent)_15%,var(--muted))]! ring-2! ring-inset! ring-accent/60!',
                              isSelected && cellRole && ROLE_SELECTED_CELL[cellRole],
                            )}
                            onMouseEnter={() => handleHeaderMouseEnter(cellIndex)}
                            onMouseLeave={handleHeaderMouseLeave}
                            {...(!readOnly && {
                              onPointerDown: event => handleCellPointerDown(0, cellIndex, event),
                              onMouseUp: () => handleCellMouseUp(0, cellIndex),
                            })}
                            aria-label={`Table header cell ${cellIndex + 1}. Click to annotate this cell.`}
                            title={`Click to annotate header cell. Ctrl/Cmd-click to select cell: ${renderedTableData[0][cellIndex]}`}
                            data-cell={`0-${cellIndex}`}
                          >
                            {cellSplits.map(split => (
                              <Split
                                key={`table-header-split-${split.componentId}-${split.start}-${split.end}`}
                                {...split}
                                onClick={anchorRect => handleSplitClick(split, anchorRect)}
                                role={getComponentRole(split.componentId, element, currentAnnotation)}
                                isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
                              />
                            ))}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="[&>tr:last-child>td:first-child]:rounded-bl-[11px] [&>tr:last-child>td:last-child]:rounded-br-[11px]">
                  {splits.slice(1).map((row, rowIndex) => (
                    <TableRow
                      // eslint-disable-next-line react/no-array-index-key
                      key={rowIndex}
                      className="border-b hover:bg-muted/10"
                    >
                      {row.map((cellSplits, cellIndex) => {
                        const actualRowIndex = rowIndex + 1
                        const isHovered = hoveredCell?.row === actualRowIndex && hoveredCell?.cell === cellIndex
                        const isSelected = isCellSelected(actualRowIndex, cellIndex)

                        return (
                          <TableCell
                            // eslint-disable-next-line react/no-array-index-key
                            key={cellIndex}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              'relative p-3 transition-colors duration-200 select-text',
                              isHovered ? 'bg-accent/10! ring-1! ring-inset! ring-accent/40!' : 'hover:bg-accent/10! hover:ring-1! hover:ring-inset! hover:ring-accent/40!',
                              isSelected && 'bg-accent/15! ring-2! ring-inset! ring-accent/60!',
                              isSelected && cellRole && ROLE_SELECTED_CELL[cellRole],
                            )}
                            onMouseEnter={() => {
                              handleRowCellEnter(actualRowIndex, cellIndex)
                              handleCellDragOver(actualRowIndex, cellIndex)
                            }}
                            onMouseLeave={handleRowCellLeave}
                            {...(!readOnly && {
                              onPointerDown: event => handleCellPointerDown(actualRowIndex, cellIndex, event),
                              onMouseUp: () => handleCellMouseUp(actualRowIndex, cellIndex),
                            })}
                            aria-label={`Table cell row ${actualRowIndex + 1}, column ${cellIndex + 1}. Click to annotate this cell.`}
                            title={`Click to annotate cell: ${renderedTableData[actualRowIndex][cellIndex]}`}
                            data-cell={`${actualRowIndex}-${cellIndex}`}
                          >
                            {cellSplits.map(split => (
                              <Split
                                key={`table-row-split-${split.componentId}-${split.start}-${split.end}`}
                                {...split}
                                onClick={anchorRect => handleSplitClick(split, anchorRect)}
                                role={getComponentRole(split.componentId, element, currentAnnotation)}
                                isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
                              />
                            ))}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="vertical" />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          {!readOnly && onSelectColumn && tableData.length > 1 && hoveredCell && columnButtonPosition && tableWrapperRef.current && createPortal(
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={columnButtonRef}
                  type="button"
                  tabIndex={-1}
                  className="absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border bg-background/95 p-1 text-muted-foreground opacity-100 shadow-sm transition-opacity before:absolute before:-inset-3 before:content-[''] after:absolute after:inset-x-0 after:-bottom-4 after:h-4 after:content-[''] hover:text-foreground focus-visible:opacity-100"
                  style={{ top: columnButtonPosition.top, left: columnButtonPosition.left }}
                  onMouseDown={event => event.stopPropagation()}
                  onPointerDown={event => event.stopPropagation()}
                  onMouseUp={event => event.stopPropagation()}
                  onClick={event => onSelectColumn(hoveredCell.cell, event.ctrlKey || event.metaKey)}
                  aria-label={`Annotate column ${hoveredCell.cell + 1}`}
                >
                  <Columns3Icon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Annotate this column. Ctrl/Cmd-click to add another column.
              </TooltipContent>
            </Tooltip>,
            tableWrapperRef.current,
          )}
          {!readOnly && onSelectRow && tableData.length > 1 && hoveredCell && rowButtonPosition && tableWrapperRef.current && createPortal(
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={rowButtonRef}
                  type="button"
                  tabIndex={-1}
                  className="absolute z-30 rounded-md border bg-background/95 p-1 text-muted-foreground opacity-100 shadow-sm transition-opacity before:absolute before:-inset-3 before:content-[''] after:absolute after:inset-y-0 after:-right-4 after:w-4 after:content-[''] hover:text-foreground focus-visible:opacity-100"
                  style={{ top: rowButtonPosition.top, left: rowButtonPosition.left }}
                  onMouseDown={event => event.stopPropagation()}
                  onPointerDown={event => event.stopPropagation()}
                  onMouseUp={event => event.stopPropagation()}
                  onMouseLeave={(event) => {
                    if (!isInRowHoverZone(event)) {
                      hoveredRowRef.current = null
                      setHoveredCell(null)
                      setRowButtonPosition(null)
                    }
                  }}
                  onClick={event => onSelectRow(hoveredCell.row, event.ctrlKey || event.metaKey)}
                  aria-label={`Annotate row ${hoveredCell.row + 1}`}
                >
                  <Rows3Icon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Annotate this row. Ctrl/Cmd-click to add another row.
              </TooltipContent>
            </Tooltip>,
            tableWrapperRef.current,
          )}
          {tableActionRailPosition && (
            <div
              className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-md border bg-background/95 p-1 opacity-0 shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
              style={{ top: tableActionRailPosition.top, left: tableActionRailPosition.left }}
            >
              {!readOnly && onSelectAll && tableData.length > 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="size-7 p-1"
                      onClick={event => onSelectAll(event.ctrlKey || event.metaKey)}
                      tabIndex={-1}
                      aria-label="Select all table cells"
                    >
                      <Grid2x2Check className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Select all cells
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-7 p-1"
                    onClick={() => copyTableAsMarkdown(tableData)}
                    tabIndex={-1}
                  >
                    {copied
                      ? (
                          <>
                            <Check className="size-4" />
                          </>
                        )
                      : (
                          <>
                            <Copy className="size-4" />
                          </>
                        )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  Copy table as Markdown
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default CombinedElement
