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
  row?: number
  cell?: number
}

export function splitWithOffsets(text: string, source: 'text' | 'table', offsets: Offset[]) {
  let lastEnd = 0
  const splits = []

  for (const offset of sortBy(offsets, o => o.start)) {
    const { start, end } = offset
    if (lastEnd < start) {
      splits.push({
        start: lastEnd,
        end: start,
        source,
        content: text.slice(lastEnd, start),
      })
    }
    splits.push({
      ...offset,
      mark: true,
      source,
      content: text.slice(start, end),
    })
    lastEnd = end
  }
  if (lastEnd < text.length) {
    splits.push({
      start: lastEnd,
      end: text.length,
      source,
      content: text.slice(lastEnd, text.length),
    })
  }

  return splits
}
