import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function selectionIsEmpty(selection: Selection) {
  if (!selection || !selection.anchorNode || !selection.focusNode)
    return true
  if (selection.toString().trim() === '')
    return true
  const position = selection.anchorNode.compareDocumentPosition(selection.focusNode)
  return position === 0 && selection.focusOffset === selection.anchorOffset
}

export function selectionIsBackwards(selection: Selection) {
  if (!selection || !selection.anchorNode || !selection.focusNode || selectionIsEmpty(selection)) {
    return false
  }

  const position = selection.anchorNode.compareDocumentPosition(selection.focusNode)

  let backward = false
  if ((!position && selection.anchorOffset > selection.focusOffset) || position === Node.DOCUMENT_POSITION_PRECEDING)
    backward = true

  return backward
}

export type Offset = {
  start: number
  end: number
  row?: number
  cell?: number
  componentId?: string
}

export type SplitComponent = {
  start: number
  end: number
  content: string
  mark?: boolean
  componentId?: string
  source?: string
  row?: number
  cell?: number
}

export function splitWithOffsets(
  text: string,
  source: string,
  offsets: Array<Offset & { componentId?: string }>,
): SplitComponent[] {
  if (!text || !offsets.length) {
    return [{ start: 0, end: text.length, content: text, source }]
  }

  // Sort offsets by start position and then by end position (longer spans first)
  const sortedOffsets = [...offsets].sort((a, b) => {
    if (a.start !== b.start)
      return a.start - b.start
    return b.end - a.end // Longer spans come first
  })

  const splits: SplitComponent[] = []
  let currentIndex = 0

  while (currentIndex < text.length) {
    // Find all annotations that include the current index
    const activeAnnotations = sortedOffsets.filter(
      offset => offset.start <= currentIndex && offset.end > currentIndex,
    )

    if (activeAnnotations.length === 0) {
      // No active annotations, find the next one
      const nextOffset = sortedOffsets.find(offset => offset.start > currentIndex)
      const end = nextOffset ? nextOffset.start : text.length

      if (end > currentIndex) {
        splits.push({
          start: currentIndex,
          end,
          content: text.slice(currentIndex, end),
          source,
        })
      }
      currentIndex = end
    } else {
      // Use the longest active annotation (which comes first due to our sorting)
      const annotation = activeAnnotations[0]
      splits.push({
        start: annotation.start,
        end: annotation.end,
        content: text.slice(annotation.start, annotation.end),
        mark: true,
        componentId: annotation.componentId,
        source,
        row: annotation.row,
        cell: annotation.cell,
      })
      currentIndex = annotation.end
    }
  }

  return splits
}

export type JsonFileType = 'json' | 'jsonlines' | 'unknown'

export async function determineJsonType(content: string): Promise<JsonFileType> {
  // Try parsing as a classic JSON file
  try {
    const parsedJson = JSON.parse(content)
    if (typeof parsedJson === 'object') {
      return 'json'
    }
  } catch {
    // Not a classic JSON, continue to check for JSON Lines
  }

  // Check if it is a JSON Lines file
  const lines = content.split('\n').filter(line => line.trim() !== '')
  const allLinesAreJson = lines.every((line) => {
    try {
      JSON.parse(line.trim())
      return true
    } catch {
      return false
    }
  })

  if (allLinesAreJson) {
    return 'jsonlines'
  }

  return 'unknown'
}

export type ImportType = 'corpuswalker' | 'labelstudio' | 'unknown'

export async function determineImportType(content: string): Promise<ImportType> {
  const jsonType = await determineJsonType(content)
  if (jsonType === 'jsonlines') {
    // Check if it's a Corpus Walker JSON Lines file
    try {
      const firstLine = JSON.parse(content.split('\n')[0])
      if ('_index' in firstLine) {
        return 'corpuswalker'
      }
    } catch {}
  } else if (jsonType === 'json') {
    // Check if it is a Label Studio JSON file
    try {
      const parsedJson = JSON.parse(content)
      if (!Array.isArray(parsedJson) || !parsedJson.length) {
        return 'unknown'
      }
      if (!parsedJson[0].data || !parsedJson[0].annotations) {
        return 'unknown'
      }
      return 'labelstudio'
    } catch {}
  }
  return 'unknown'
}

export class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedFileTypeError'
  }
}

export class InvalidJsonLinesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidJsonLinesError'
  }
}
