import type { ClassValue } from 'clsx'
import type { DocumentAnnotation, ExportModel } from '@/types/types'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function isMac() {
  return typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
}

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
  currentAnnotationOffsets: Array<Offset & { componentId?: string }> = [],
): SplitComponent[] {
  if (!text || (offsets.length === 0 && currentAnnotationOffsets.length === 0)) {
    return [{ start: 0, end: text.length, content: text, source }]
  }

  const allOffsets = [...offsets, ...currentAnnotationOffsets]

  const isCurrent = new Set(currentAnnotationOffsets.map(o => o.componentId))

  // Sort by priority: current > longer > earlier start
  allOffsets.sort((a, b) => {
    const aIsCurrent = isCurrent.has(a.componentId)
    const bIsCurrent = isCurrent.has(b.componentId)
    if (aIsCurrent !== bIsCurrent)
      return aIsCurrent ? -1 : 1
    const lenDiff = (b.end - b.start) - (a.end - a.start)
    return lenDiff !== 0 ? lenDiff : a.start - b.start
  })

  const characterMap = new Map<number, Offset & { componentId?: string }>()

  for (const o of allOffsets) {
    for (let i = o.start; i < o.end; i++) {
      if (!characterMap.has(i)) {
        characterMap.set(i, o)
      }
    }
  }

  const splits: SplitComponent[] = []
  let i = 0

  while (i < text.length) {
    const annotation = characterMap.get(i)
    const start = i

    while (
      i < text.length
      && characterMap.get(i)?.componentId === annotation?.componentId
    ) {
      i++
    }

    const end = i
    const content = text.slice(start, end)

    if (annotation) {
      splits.push({
        start,
        end,
        content: content.trim(),
        mark: true,
        componentId: annotation.componentId,
        source,
        row: annotation.row,
        cell: annotation.cell,
      })
    } else {
      splits.push({
        start,
        end,
        content,
        source,
      })
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

export type ImportType = 'corpuswalker' | 'labelstudio' | 'irit-zip' | 'full-corpus-export' | 'unknown'

export async function determineImportType(content: string, fileName?: string): Promise<ImportType> {
  if (fileName?.toLowerCase().endsWith('.zip')) {
    // Check if it's an IRIT zip format
    if (fileName.toLowerCase().includes('irit') || fileName.toLowerCase().includes('iswc')) {
      return 'irit-zip'
    }
  }

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
    try {
      // Check if it is a full corpus export
      const parsedJson = JSON.parse(content) as ExportModel
      if (parsedJson.exportMeta?.type === 'full-corpus-export' && Array.isArray(parsedJson.documents)) {
        return 'full-corpus-export'
      }

      // Check if it is a Label Studio JSON file
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

type AnnotationType = 'text' | 'table' | 'joint'

export function getAnnotationType(annotation: DocumentAnnotation): AnnotationType {
  const types = [
    annotation.subject.annotationType,
    annotation.predicate.annotationType,
    annotation.object.annotationType,
  ]

  const hasText = types.includes('text')
  const hasTable = types.includes('table')

  if (hasText && hasTable) {
    return 'joint'
  }
  if (types.every(type => type === 'table')) {
    return 'table'
  }
  if (types.every(type => type === 'text')) {
    return 'text'
  }

  return 'joint'
}
