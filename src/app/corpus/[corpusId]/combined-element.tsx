import type { Offset } from '@/lib/utils'
import type { DocumentElement } from './corpus-view'
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
}

function CombinedElement({ elementIndex, value, type, data, handleTextSelection, handleTableSelection, handleSplitClick, documentElements }: CombinedElementProps) {
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
                color={TYPE_TO_COLOR[element.components.find(annotation => annotation.annotationStart === split.start)?.annotationTag as keyof typeof TYPE_TO_COLOR]}
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
        })))
      }),
    )

    return (
      <div key={elementIndex} className="mb-6" id={`element-${elementIndex}`}>
        <Table>
          <TableHeader>
            {splits.slice(0, 1).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cellSplits, cellIndex) => (
                  <TableHead
                    key={cellIndex}
                    role="textbox"
                    tabIndex={0}
                    onMouseUp={() => handleTableSelection(elementIndex, 0, cellIndex)}
                    onKeyUp={e => e.key === 'Enter' && handleTableSelection(elementIndex, 0, cellIndex)}
                  >
                    {cellSplits.map(split => (
                      <Split
                        key={`table-header-split-${split.componentId}-${split.start}-${split.end}`}
                        {...split}
                        onClick={() => handleSplitClick(split)}
                        color={TYPE_TO_COLOR[element.components.find(annotation =>
                          annotation.annotationRow === rowIndex
                          && annotation.annotationCell === cellIndex
                          && annotation.annotationStart === split.start
                          && annotation.annotationEnd === split.end,
                        )?.annotationTag as keyof typeof TYPE_TO_COLOR]}
                      />
                    ))}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {splits.slice(1).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cellSplits, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    role="textbox"
                    onMouseUp={() => handleTableSelection(elementIndex, rowIndex + 1, cellIndex)}
                    onKeyUp={e => e.key === 'Enter' && handleTableSelection(elementIndex, rowIndex + 1, cellIndex)}
                  >
                    {cellSplits.map(split => (
                      <Split
                        key={`table-row-split-${split.componentId}-${split.start}-${split.end}`}
                        {...split}
                        onClick={() => handleSplitClick(split)}
                        color={TYPE_TO_COLOR[element.components.find(annotation =>
                          annotation.annotationRow === rowIndex + 1
                          && annotation.annotationCell === cellIndex
                          && annotation.annotationStart === split.start
                          && annotation.annotationEnd === split.end,
                        )?.annotationTag as keyof typeof TYPE_TO_COLOR]}
                      />
                    ))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return null
}

export default CombinedElement
