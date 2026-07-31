import type {
  DocumentData,
  DocumentExtractionMetadata,
  TextOrTableElement,
} from '@/types/types'
import wtf from 'wtf_wikipedia'

type UnindexedDocumentElement
  = | Omit<Extract<TextOrTableElement, { type: 'text' }>, 'elementIndex'>
    | Omit<Extract<TextOrTableElement, { type: 'table' }>, 'elementIndex'>

type PositionedDocumentElement = UnindexedDocumentElement & {
  startOffset: number
}

function getExtractionMetadata(
  documentData: DocumentData | undefined,
): DocumentExtractionMetadata | undefined {
  const extractionMetadata = documentData?._source?.extractionMetadata
  return Array.isArray(extractionMetadata) ? extractionMetadata[0] : extractionMetadata
}

function normalizeTextValue(value: string | null | undefined): string {
  return value ?? ''
}

function normalizeTableData(
  tableData: Array<Array<string | null>> | null | undefined,
): string[][] {
  if (!Array.isArray(tableData)) {
    return []
  }

  return tableData.map(row =>
    Array.isArray(row)
      ? row.map(cell => cell ?? '')
      : [],
  )
}

function indexDocumentElements(elements: UnindexedDocumentElement[]): TextOrTableElement[] {
  const orderedElements = elements.every(isPositionedDocumentElement)
    ? [...elements].sort((left, right) => left.startOffset - right.startOffset)
    : elements

  return orderedElements.map((element, elementIndex) => ({
    ...element,
    elementIndex,
  }))
}

function isPositionedDocumentElement(
  element: UnindexedDocumentElement,
): element is PositionedDocumentElement {
  return typeof element.startOffset === 'number'
}

export function buildDocumentElements(
  documentData: DocumentData | undefined,
): TextOrTableElement[] {
  const extractionMetadata = getExtractionMetadata(documentData)
  if (!extractionMetadata) {
    return []
  }

  const texts = Array.isArray(extractionMetadata.texts) ? extractionMetadata.texts : []
  const tables = Array.isArray(extractionMetadata.tables) ? extractionMetadata.tables : []

  const textElements: UnindexedDocumentElement[] = texts.map((text) => {
    const value = normalizeTextValue(text.value)

    return {
      type: 'text',
      startOffset: text.startOffset,
      endOffset: text.endOffset,
      value: extractionMetadata.technology === 'WikitextExtractor'
        ? wtf(value).text()
        : value,
      data: { ...text },
    }
  })
  const tableElements: UnindexedDocumentElement[] = tables.map(table => ({
    type: 'table',
    startOffset: table.startOffset,
    endOffset: table.endOffset,
    value: normalizeTableData(table.tableData),
    data: { ...table },
  }))

  return indexDocumentElements([...textElements, ...tableElements])
}
