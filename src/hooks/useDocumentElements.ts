import type { DocumentData, TextOrTableElement } from '@/types/types'
import { useEffect, useState } from 'react'
import wtf from 'wtf_wikipedia'

export function useDocumentElements(documentData: DocumentData | undefined) {
  const [combinedElements, setCombinedElements] = useState<TextOrTableElement[]>([])

  useEffect(() => {
    if (!documentData?._source)
      return

    const els = [
      ...documentData._source.extractionMetadata[0].texts.map((text: any) => ({
        type: 'text' as const,
        startOffset: text.startOffset,
        endOffset: text.endOffset,
        value: documentData._source.extractionMetadata[0].technology === 'WikitextExtractor'
          ? wtf(text.value).text()
          : text.value,
        data: {
          ...text,
        },
      })),
      ...documentData._source.extractionMetadata[0].tables.map((table: any) => ({
        type: 'table' as const,
        startOffset: table.startOffset,
        endOffset: table.endOffset,
        value: table.tableData,
        data: {
          ...table,
        },
      })),
    ].sort((a, b) => a.startOffset - b.startOffset).map((el, index) => ({ ...el, elementIndex: index }))

    setCombinedElements(els)
  }, [documentData])

  return combinedElements
}
