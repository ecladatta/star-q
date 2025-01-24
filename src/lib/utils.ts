import { type ClassValue, clsx } from 'clsx'
import sortBy from 'lodash.sortby'
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
  row?: number | null
  cell?: number | null
  componentId?: string
}

export function splitWithOffsets(text: string, source: 'text' | 'table', offsets: Offset[]) {
  let lastEnd = 0
  const splits = []

  for (const offset of sortBy(offsets, o => o.start)) {
    const { componentId, start, end } = offset
    if (lastEnd < start) {
      splits.push({
        componentId,
        start: lastEnd,
        end: start,
        source,
        content: text.slice(lastEnd, start),
      })
    }
    splits.push({
      componentId,
      start,
      end,
      mark: true,
      source,
      content: text.slice(start, end),
    })
    lastEnd = end
  }
  if (lastEnd < text.length) {
    splits.push({
      componentId: undefined,
      start: lastEnd,
      end: text.length,
      source,
      content: text.slice(lastEnd, text.length),
    })
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
      // console.log('line:', line)
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
