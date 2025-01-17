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
  handleSplitClick: (index: number, split: { start: number, end: number }) => void
  documentElements: DocumentElement[]
}

function CombinedElement({ elementIndex, value, type, data, handleTextSelection, handleTableSelection, handleSplitClick, documentElements }: CombinedElementProps) {
  if (!documentElements[elementIndex]) {
    return null
  }

  if (type === 'text') {
    const rawText = value as string

    const splits = splitWithOffsets(rawText, 'text', documentElements[elementIndex].components.map(
      annotation => ({ start: annotation.annotationStart, end: annotation.annotationEnd, row: annotation.annotationRow, cell: annotation.annotationCell }),
    ))

    return (
      <div key={elementIndex} className="mb-4">
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
                key={`${split.start}-${split.end}`}
                {...split}
                onClick={() => handleSplitClick(elementIndex, split)}
                color={TYPE_TO_COLOR[documentElements[elementIndex].components.find(annotation => annotation.annotationStart === split.start)?.annotationTag as keyof typeof TYPE_TO_COLOR]}
              />
            ))}
        </div>
      </div>
    )
  } else if (type === 'table') {
    const tableData = value as string[][]

    const splits = tableData.map((row, rowIndex) =>
      row.map((cell, cellIndex) => {
        const cellAnnotations = documentElements[elementIndex].components.filter(
          annotation => annotation.annotationRow === rowIndex && annotation.annotationCell === cellIndex,
        )
        return splitWithOffsets(cell, 'table', cellAnnotations.map(annotation => ({ start: annotation.annotationStart, end: annotation.annotationEnd })))
      }),
    )

    return (
      <div key={elementIndex} className="mb-6">
        <Table>
          <TableHeader>
            {splits.slice(0, 1).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cellSplits, cellIndex) => (
                  <TableHead
                    key={cellIndex}
                    role="button"
                    tabIndex={0}
                    onMouseUp={() => handleTableSelection(elementIndex, 0, cellIndex)}
                    onKeyUp={e => e.key === 'Enter' && handleTableSelection(elementIndex, 0, cellIndex)}
                  >
                    {cellSplits.map(split => (
                      <Split
                        key={`${split.start}-${split.end}`}
                        {...split}
                        onClick={() => handleSplitClick(elementIndex, split)}
                        color={TYPE_TO_COLOR[documentElements[elementIndex].components.find(annotation =>
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
                    role="button"
                    tabIndex={0}
                    onMouseUp={() => handleTableSelection(elementIndex, rowIndex + 1, cellIndex)}
                    onKeyUp={e => e.key === 'Enter' && handleTableSelection(elementIndex, rowIndex + 1, cellIndex)}
                  >
                    {cellSplits.map(split => (
                      <Split
                        key={`${split.start}-${split.end}`}
                        {...split}
                        onClick={() => handleSplitClick(elementIndex, split)}
                        color={TYPE_TO_COLOR[documentElements[elementIndex].components.find(annotation =>
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
