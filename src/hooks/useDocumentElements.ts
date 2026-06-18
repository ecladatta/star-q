import type { DocumentData, DocumentExtractionMetadata, TextOrTableElement } from '@/types/types'
import { useEffect, useState } from 'react'
import wtf from 'wtf_wikipedia'

type UnindexedDocumentElement = Omit<TextOrTableElement, 'elementIndex'>

function normalizeTextValue(value: string | null | undefined): string {
  return value == null ? '' : value
}

function normalizeTableData(tableData: Array<Array<string | null>> | null | undefined): string[][] {
  if (!Array.isArray(tableData))
    return []

  return tableData.map(row =>
    Array.isArray(row)
      ? row.map(cell => cell ?? '')
      : [],
  )
}

function indexDocumentElements(elements: UnindexedDocumentElement[]): TextOrTableElement[] {
  const orderedElements = elements.every(element => typeof element.startOffset === 'number')
    ? [...elements].sort((a, b) => a.startOffset! - b.startOffset!)
    : elements

  return orderedElements
    .map((element, index) => ({
      ...element,
      elementIndex: index,
    }))
}

function getExtractionMetadata(documentData: DocumentData | undefined): DocumentExtractionMetadata | undefined {
  const extractionMetadata = documentData?._source?.extractionMetadata
  return Array.isArray(extractionMetadata) ? extractionMetadata[0] : extractionMetadata
}

export function buildDocumentElements(documentData: DocumentData | undefined): TextOrTableElement[] {
  const extractionMetadata = getExtractionMetadata(documentData)
  if (!extractionMetadata)
    return []

  const texts = Array.isArray(extractionMetadata.texts) ? extractionMetadata.texts : []
  const tables = Array.isArray(extractionMetadata.tables) ? extractionMetadata.tables : []

  const textElements = texts.map((text) => {
    const value = normalizeTextValue(text.value)

    return {
      type: 'text' as const,
      startOffset: text.startOffset,
      endOffset: text.endOffset,
      value: extractionMetadata.technology === 'WikitextExtractor'
        ? wtf(value).text()
        : value,
      data: {
        ...text,
      },
    }
  })

  const tableElements = tables.map(table => ({
    type: 'table' as const,
    startOffset: table.startOffset,
    endOffset: table.endOffset,
    value: normalizeTableData(table.tableData),
    data: {
      ...table,
    },
  }))

  return indexDocumentElements([
    ...textElements,
    ...tableElements,
  ])
}

export function useDocumentElements(documentData: DocumentData | undefined) {
  const [combinedElements, setCombinedElements] = useState<TextOrTableElement[]>([])

  useEffect(() => {
    setCombinedElements(buildDocumentElements(documentData))
  }, [documentData])

  return combinedElements
}
