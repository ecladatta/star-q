'use client'
import type { Offset } from '@/lib/utils'
import type { CurrentAnnotation, DocumentElement } from '@/types/types'
import { Check, Copy } from 'lucide-react'
import { createElement, useState } from 'react'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn, splitWithOffsets } from '@/lib/utils'
import Split from './split'

export type CombinedElementProps = {
  elementIndex: number
  value: string | string[][]
  type: 'text' | 'table'
  data: { title: string, level?: number }
  handleTextSelection: (index: number) => void
  handleTableSelection: (index: number, row: number, cell: number) => void
  handleSplitClick: (split: Offset) => void
  documentElements: DocumentElement[]
  currentAnnotation: CurrentAnnotation | null
}

function isComponentFromCurrentAnnotation(componentId: string, currentAnnotation: CurrentAnnotation | null): boolean {
  if (!currentAnnotation)
    return false
  return componentId === currentAnnotation.subject?.id
    || componentId === currentAnnotation.predicate?.id
    || componentId === currentAnnotation.object?.id
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

    // Extract current annotation offsets for this element to handle overlaps
    const currentAnnotationOffsets = currentAnnotation
      ? [
          currentAnnotation.subject,
          currentAnnotation.predicate,
          currentAnnotation.object,
        ]
          .filter(component => component && component.elementIndex === elementIndex)
          .map(component => ({
            start: component!.annotationStart,
            end: component!.annotationEnd,
            row: component!.annotationRow ?? undefined,
            cell: component!.annotationCell ?? undefined,
            componentId: component!.id,
          }))
      : []

    const splits = splitWithOffsets(
      rawText,
      'text',
      element.components.map(component => ({
        start: component.annotationStart,
        end: component.annotationEnd,
        row: component.annotationRow ?? undefined,
        cell: component.annotationCell ?? undefined,
        componentId: component.id,
      })),
      currentAnnotationOffsets,
    )

    return (
      <div key={elementIndex} className="mb-4" id={`element-${elementIndex}`}>
        {createElement(data.level ? `h${data.level}` : 'div', { className: 'mb-2 font-semibold' }, data.title)}
        <div
          className="text-lg leading-relaxed"
          role="textbox"
          tabIndex={0}
          onMouseUp={() => handleTextSelection(elementIndex)}
          onKeyUp={e => e.key === 'Enter' && handleTextSelection(elementIndex)}
        >
          {splits
            .filter(split => split.source === 'text')
            .map(split => (
              <Split
                key={`text-split-${split.componentId}-${split.start}-${split.end}`}
                {...split}
                onClick={() => handleSplitClick(split)}
                color={TYPE_TO_COLOR[element.components.find(annotation => annotation.id === split.componentId)?.annotationTag as keyof typeof TYPE_TO_COLOR]}
                isCurrentAnnotation={split.componentId ? isComponentFromCurrentAnnotation(split.componentId, currentAnnotation) : false}
              />
            ))}
        </div>
      </div>
    )
  } else if (type === 'table') {
    const tableData = value as string[][]

    const splits = tableData.map((row, rowIndex) =>
      row.map((cell, cellIndex) => {
        const cellAnnotations = element.components.filter(
          annotation => annotation.annotationRow === rowIndex && annotation.annotationCell === cellIndex,
        )

        // Extract current annotation offsets for this specific cell
        const currentAnnotationOffsets = currentAnnotation
          ? [
              currentAnnotation.subject,
              currentAnnotation.predicate,
              currentAnnotation.object,
            ]
              .filter(component =>
                component
                && component.elementIndex === elementIndex
                && component.annotationRow === rowIndex
                && component.annotationCell === cellIndex,
              )
              .map(component => ({
                start: component!.annotationStart,
                end: component!.annotationEnd,
                id: component!.id,
                componentId: component!.id,
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

    // Determine which annotation components are in this table
    const hasSubject = currentAnnotation?.subject?.elementIndex === elementIndex
    const hasPredicate = currentAnnotation?.predicate?.elementIndex === elementIndex
    const hasObject = currentAnnotation?.object?.elementIndex === elementIndex

    // Build the border style based on which components are present
    const borderLayers: string[] = []
    let borderOffset = 0
    const borderConfig = [
      { present: hasSubject, color: '#FFE4B5' },
      { present: hasPredicate, color: '#ADD8E6' },
      { present: hasObject, color: '#90EE90' },
    ]
    borderConfig.forEach(({ present, color }) => {
      if (present) {
        if (borderOffset > 0) {
          borderLayers.push(`0 0 0 ${borderOffset + 1}px white`)
          borderOffset += 1
        }
        borderLayers.push(`0 0 0 ${borderOffset + 3}px ${color}`)
        borderOffset += 3
      }
    })
    const boxShadowStyle = borderLayers.length > 0 ? borderLayers.join(', ') : undefined

    return (
      <div key={elementIndex} className="group mb-6" id={`element-${elementIndex}`}>
        <div className="mb-2 flex items-center justify-between">
          {data.title && <div className="text-sm font-semibold">{data.title}</div>}
          <div
            className="group relative ml-auto"
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
          className="flex max-h-[60vh] w-full flex-col overflow-y-auto rounded-xl border transition-shadow duration-200"
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
                        className={cn('relative select-text p-3 font-medium transition-all duration-200', isHovered ? '!bg-blue-50 shadow-[inset_0_0_0_1px_rgb(147_197_253)]' : 'hover:!bg-blue-50 hover:shadow-[inset_0_0_0_1px_rgb(147_197_253)]')}
                        onMouseEnter={() => setHoveredCell({ row: 0, cell: cellIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onMouseUp={() => handleCellMouseUp(0, cellIndex)}
                        aria-label={`Table header cell ${cellIndex + 1}. Click to annotate this cell.`}
                        title={`Click to annotate header cell: ${tableData[0][cellIndex]}`}
                        data-cell={`0-${cellIndex}`}
                      >
                        {cellSplits.map(split => (
                          <Split
                            key={`table-header-split-${split.componentId}-${split.start}-${split.end}`}
                            {...split}
                            onClick={() => handleSplitClick(split)}
                            color={TYPE_TO_COLOR[element.components.find(annotation =>
                              annotation.id === split.componentId,
                            )?.annotationTag as keyof typeof TYPE_TO_COLOR]}
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
                        className={cn('relative select-text p-3 transition-all duration-200', isHovered ? '!bg-blue-50 shadow-[inset_0_0_0_1px_rgb(147_197_253)]' : 'hover:!bg-blue-50 hover:shadow-[inset_0_0_0_1px_rgb(147_197_253)]')}
                        onMouseEnter={() => setHoveredCell({ row: actualRowIndex, cell: cellIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onMouseUp={() => handleCellMouseUp(actualRowIndex, cellIndex)}
                        aria-label={`Table cell row ${actualRowIndex + 1}, column ${cellIndex + 1}. Click to annotate this cell.`}
                        title={`Click to annotate cell: ${tableData[actualRowIndex][cellIndex]}`}
                        data-cell={`${actualRowIndex}-${cellIndex}`}
                      >
                        {cellSplits.map(split => (
                          <Split
                            key={`table-row-split-${split.componentId}-${split.start}-${split.end}`}
                            {...split}
                            onClick={() => handleSplitClick(split)}
                            color={TYPE_TO_COLOR[element.components.find(annotation =>
                              annotation.id === split.componentId,
                            )?.annotationTag as keyof typeof TYPE_TO_COLOR]}
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
