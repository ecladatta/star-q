import type { Offset } from '@/lib/utils'
import type { CurrentAnnotation, DocumentElement } from './corpus-view'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { splitWithOffsets } from '@/lib/utils'
import React from 'react'
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
  const element = documentElements[elementIndex]
  if (!element) {
    return null
  }

  if (type === 'text') {
    const rawText = value as string

    const splits = splitWithOffsets(rawText, 'text', element.components.map(
      component => ({
        start: component.annotationStart,
        end: component.annotationEnd,
        row: component.annotationRow ?? undefined,
        cell: component.annotationCell ?? undefined,
        componentId: component.id,
      }),
    ))

    return (
      <div key={elementIndex} className="mb-4" id={`element-${elementIndex}`}>
        {React.createElement(data.level ? `h${data.level}` : 'div', { className: 'mb-2 font-semibold' }, data.title)}
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
        return splitWithOffsets(cell, 'table', cellAnnotations.map(annotation => ({
          start: annotation.annotationStart,
          end: annotation.annotationEnd,
          id: annotation.id,
          componentId: annotation.id,
        })))
      }),
    )

    return (
      <div key={elementIndex} className="mb-6" id={`element-${elementIndex}`}>
        {data.title && <div className="mb-2 font-semibold">{data.title}</div>}
        <ScrollArea className="flex max-h-[60vh] w-full flex-col overflow-y-auto rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/50">
              {splits.slice(0, 1).map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-muted/20">
                  {row.map((cellSplits, cellIndex) => (
                    <TableHead
                      key={cellIndex}
                      role="textbox"
                      tabIndex={0}
                      className="p-3 font-medium transition-colors"
                      onMouseUp={() => handleTableSelection(elementIndex, 0, cellIndex)}
                      onKeyUp={e => e.key === 'Enter' && handleTableSelection(elementIndex, 0, cellIndex)}
                      aria-label={`Table header ${cellIndex + 1}`}
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
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {splits.slice(1).map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-b hover:bg-muted/10">
                  {row.map((cellSplits, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      role="textbox"
                      tabIndex={0}
                      className="p-3 transition-colors"
                      onMouseUp={() => handleTableSelection(elementIndex, rowIndex + 1, cellIndex)}
                      onKeyUp={e => e.key === 'Enter' && handleTableSelection(elementIndex, rowIndex + 1, cellIndex)}
                      aria-label={`Row ${rowIndex + 1}, Column ${cellIndex + 1}`}
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
                  ))}
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
