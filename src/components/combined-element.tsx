'use client'
import type { Offset } from '@/lib/utils'
import type { CurrentAnnotation, DocumentElement } from '@/types/types'
import { Check, Copy } from 'lucide-react'
import { createElement, useState } from 'react'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAnnotationComponents } from '@/lib/annotation-roles'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn, splitWithOffsets } from '@/lib/utils'
import Split from './split'

export type CombinedElementProps = {
  elementIndex: number
  value: string | string[][]
  type: 'text' | 'table'
  data: { title: string, level?: number }
  handleTextSelection: (index: number, selectionContainer: Element, textSource?: string) => void
  handleTableSelection: (index: number, row: number, cell: number) => void
  handleSplitClick: (split: Offset, anchorRect?: DOMRect) => void
  documentElements: DocumentElement[]
  currentAnnotation: CurrentAnnotation | null
}

function isComponentFromCurrentAnnotation(componentId: string, currentAnnotation: CurrentAnnotation | null): boolean {
  if (!currentAnnotation)
    return false
  return getAnnotationComponents(currentAnnotation).some(component => component.id === componentId)
}

function normalizeRenderedWhitespace(text: string | null | undefined) {
  return (text ?? '').replace(/[\u00A0\u202F]/g, ' ')
}

function getComponentColor(
  componentId: string | undefined,
  element: DocumentElement,
  currentAnnotation: CurrentAnnotation | null,
): string {
  const component = element.components.find(annotation => annotation.id === componentId)
    ?? (currentAnnotation
      ? getAnnotationComponents(currentAnnotation).find(annotation => annotation.id === componentId)
      : undefined)

  return component ? TYPE_TO_COLOR[component.annotationTag] : 'lightgrey'
}

function CombinedElement({
  elementIndex,
  value,
  type,
  data,
  handleTextSelection,
  handleTableSelection,
  handleSplitClick,
  documentElements,
  currentAnnotation,
}: CombinedElementProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number, cell: number } | null>(null)
  const [copied, setCopied] = useState(false)

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
      setTimeout(() => setCopied(false), 2000)
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
          onMouseUp: (event: React.MouseEvent<HTMLElement>) =>
            handleTextSelection(elementIndex, event.currentTarget, rawTitle),
          onKeyUp: (event: React.KeyboardEvent<HTMLElement>) =>
            event.key === 'Enter' && handleTextSelection(elementIndex, event.currentTarget, rawTitle),
          role: 'textbox',
          tabIndex: 0,
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
              color={getComponentColor(split.componentId, element, currentAnnotation)}
              isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
            />
          ))
      : renderedTitle

    return (
      <div key={elementIndex} className="mb-4 min-w-0" id={`element-${elementIndex}`}>
        {createElement(data.level ? `h${data.level}` : 'div', headingProps, headingContent)}
        <div
          className="min-w-0 text-lg/relaxed wrap-break-word"
          role="textbox"
          tabIndex={0}
          onMouseUp={event => handleTextSelection(elementIndex, event.currentTarget)}
          onKeyUp={event => event.key === 'Enter' && handleTextSelection(elementIndex, event.currentTarget)}
        >
          {splits
            .filter(split => split.source === 'text')
            .map(split => (
              <Split
                key={`text-split-${split.componentId}-${split.start}-${split.end}`}
                {...split}
                className="wrap-break-word"
                onClick={anchorRect => handleSplitClick(split, anchorRect)}
                color={getComponentColor(split.componentId, element, currentAnnotation)}
                isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
              />
            ))}
        </div>
      </div>
    )
  } else if (type === 'table') {
    const tableData = value as string[][]
    const renderedTableData = tableData.map(row => row.map(normalizeRenderedWhitespace))

    const splits = renderedTableData.map((row, rowIndex) =>
      row.map((cell, cellIndex) => {
        const cellAnnotations = element.components.filter(
          annotation => annotation.annotationRow === rowIndex && annotation.annotationCell === cellIndex,
        )

        // Extract current annotation offsets for this specific cell
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
      // Small delay to ensure selection state is properly updated
      setTimeout(() => {
        const selection = window.getSelection()

        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          // There's a text selection - handle it as text selection
          handleTableSelection(elementIndex, rowIndex, cellIndex)
        } else {
          // No text selection - handle as whole cell click
          handleTableSelection(elementIndex, rowIndex, cellIndex)
        }
      }, 50)
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
          .map(component => ({ color: TYPE_TO_COLOR[component.annotationTag] }))
      : []
    borderConfig.forEach(({ color }) => {
      if (borderOffset > 0) {
        borderLayers.push(`0 0 0 ${borderOffset + 1}px white`)
        borderOffset += 1
      }
      borderLayers.push(`0 0 0 ${borderOffset + 3}px ${color}`)
      borderOffset += 3
    })
    const boxShadowStyle = borderLayers.length > 0 ? borderLayers.join(', ') : undefined

    return (
      <div key={elementIndex} className="group mb-6 min-w-0" id={`element-${elementIndex}`}>
        <div className="mb-2 flex min-w-0 items-center justify-between">
          {data.title && <div className="min-w-0 text-sm font-semibold wrap-break-word">{normalizeRenderedWhitespace(data.title)}</div>}
          <div
            className="group relative ml-auto shrink-0"
          >
            <Button
              variant="outline"
              size="sm"
              className="opacity-0 transition-opacity group-hover:opacity-100"
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
          </div>
        </div>
        <ScrollArea
          className="flex max-h-[60vh] w-full min-w-0 flex-col overflow-y-auto rounded-xl border transition-shadow duration-200"
          style={{ boxShadow: boxShadowStyle }}
        >
          <Table>
            <TableHeader className="bg-muted/50">
              {splits.slice(0, 1).map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-muted/20">
                  {row.map((cellSplits, cellIndex) => {
                    const isHovered = hoveredCell?.row === 0 && hoveredCell?.cell === cellIndex

                    return (
                      <TableHead
                        key={cellIndex}
                        role="button"
                        tabIndex={0}
                        className={cn('relative p-3 font-medium transition-all duration-200 select-text', isHovered ? 'bg-blue-50! shadow-[inset_0_0_0_1px_rgb(147_197_253)]' : 'hover:bg-blue-50! hover:shadow-[inset_0_0_0_1px_rgb(147_197_253)]')}
                        onMouseEnter={() => setHoveredCell({ row: 0, cell: cellIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onMouseUp={() => handleCellMouseUp(0, cellIndex)}
                        aria-label={`Table header cell ${cellIndex + 1}. Click to annotate this cell.`}
                        title={`Click to annotate header cell: ${renderedTableData[0][cellIndex]}`}
                        data-cell={`0-${cellIndex}`}
                      >
                        {cellSplits.map(split => (
                          <Split
                            key={`table-header-split-${split.componentId}-${split.start}-${split.end}`}
                            {...split}
                            onClick={anchorRect => handleSplitClick(split, anchorRect)}
                            color={getComponentColor(split.componentId, element, currentAnnotation)}
                            isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
                          />
                        ))}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {splits.slice(1).map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-b hover:bg-muted/10">
                  {row.map((cellSplits, cellIndex) => {
                    const actualRowIndex = rowIndex + 1
                    const isHovered = hoveredCell?.row === actualRowIndex && hoveredCell?.cell === cellIndex

                    return (
                      <TableCell
                        key={cellIndex}
                        role="button"
                        tabIndex={0}
                        className={cn('relative p-3 transition-all duration-200 select-text', isHovered ? 'bg-blue-50! shadow-[inset_0_0_0_1px_rgb(147_197_253)]' : 'hover:bg-blue-50! hover:shadow-[inset_0_0_0_1px_rgb(147_197_253)]')}
                        onMouseEnter={() => setHoveredCell({ row: actualRowIndex, cell: cellIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onMouseUp={() => handleCellMouseUp(actualRowIndex, cellIndex)}
                        aria-label={`Table cell row ${actualRowIndex + 1}, column ${cellIndex + 1}. Click to annotate this cell.`}
                        title={`Click to annotate cell: ${renderedTableData[actualRowIndex][cellIndex]}`}
                        data-cell={`${actualRowIndex}-${cellIndex}`}
                      >
                        {cellSplits.map(split => (
                          <Split
                            key={`table-row-split-${split.componentId}-${split.start}-${split.end}`}
                            {...split}
                            onClick={anchorRect => handleSplitClick(split, anchorRect)}
                            color={getComponentColor(split.componentId, element, currentAnnotation)}
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
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    )
  }

  return null
}

export default CombinedElement
