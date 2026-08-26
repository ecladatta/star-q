import type {
  DocumentAnnotation,
  DocumentAnnotationComponent,
} from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  annotationComponentsShareSegment,
  getAnnotationType,
  splitWithOffsets,
} from './utils'

function component(overrides: Partial<DocumentAnnotationComponent> = {}): DocumentAnnotationComponent {
  return {
    id: 'c1',
    entityLabel: null,
    entityValue: null,
    entityCustom: null,
    entityCustomId: null,
    entityDatatype: null,
    annotationStart: 0,
    annotationEnd: 1,
    annotationRow: null,
    annotationCell: null,
    annotationValue: 'value',
    annotationType: 'text',
    annotationTag: 'subject',
    elementIndex: 0,
    ...overrides,
  }
}

function annotation(overrides: Partial<DocumentAnnotation> = {}): DocumentAnnotation {
  return {
    id: 'a1',
    subjectId: 's1',
    predicateId: 'p1',
    objectId: 'o1',
    annotationId: 'a1',
    documentId: 'd1',
    corpusId: 'c1',
    subject: component({ annotationTag: 'subject' }),
    predicate: component({ annotationTag: 'predicate' }),
    object: component({ annotationTag: 'object' }),
    qualifiers: [],
    ...overrides,
  }
}

describe('splitWithOffsets', () => {
  it('returns the whole text as a single unmarked segment when there are no offsets', () => {
    expect(splitWithOffsets('hello world', 'text', [])).toEqual([
      { start: 0, end: 11, content: 'hello world', source: 'text' },
    ])
  })

  it('marks an annotated range and trims its content', () => {
    expect(splitWithOffsets('hello world', 'text', [
      { start: 6, end: 11, componentId: 'a1' },
    ])).toEqual([
      { start: 0, end: 6, content: 'hello ', source: 'text' },
      { start: 6, end: 11, content: 'world', mark: true, componentId: 'a1', source: 'text' },
    ])
  })

  it('prefers the current annotation over an existing one on overlap', () => {
    expect(splitWithOffsets('abcdef', 'text', [
      { start: 0, end: 6, componentId: 'old' },
    ], [
      { start: 2, end: 4, componentId: 'current' },
    ]).filter(part => part.mark)).toEqual([
      { start: 0, end: 2, content: 'ab', mark: true, componentId: 'old', source: 'text' },
      { start: 2, end: 4, content: 'cd', mark: true, componentId: 'current', source: 'text' },
      { start: 4, end: 6, content: 'ef', mark: true, componentId: 'old', source: 'text' },
    ])
  })

  it('prefers a longer range and then an earlier start', () => {
    expect(splitWithOffsets('abcdef', 'text', [
      { start: 0, end: 2, componentId: 'short' },
      { start: 1, end: 4, componentId: 'long' },
    ]).filter(part => part.mark)).toEqual([
      { start: 0, end: 1, content: 'a', mark: true, componentId: 'short', source: 'text' },
      { start: 1, end: 4, content: 'bcd', mark: true, componentId: 'long', source: 'text' },
    ])
  })

  it('carries table row and cell through to marked segments', () => {
    expect(splitWithOffsets('cell', 'table', [
      { start: 0, end: 4, componentId: 't1', row: 2, cell: 3 },
    ])).toEqual([
      { start: 0, end: 4, content: 'cell', mark: true, componentId: 't1', source: 'table', row: 2, cell: 3 },
    ])
  })
})

describe('getAnnotationType', () => {
  it('classifies all-text annotations as text', () => {
    expect(getAnnotationType(annotation())).toBe('text')
  })

  it('classifies all-table annotations as table', () => {
    expect(getAnnotationType(annotation({
      subject: component({ annotationType: 'table', annotationTag: 'subject' }),
      predicate: component({ annotationType: 'table', annotationTag: 'predicate' }),
      object: component({ annotationType: 'table', annotationTag: 'object' }),
    }))).toBe('table')
  })

  it('classifies mixed annotations as joint', () => {
    expect(getAnnotationType(annotation({
      subject: component({ annotationType: 'table', annotationTag: 'subject' }),
    }))).toBe('joint')
  })
})

describe('annotationComponentsShareSegment', () => {
  it('returns true for components over the same text segment', () => {
    const a = component({ elementIndex: 0, annotationStart: 2, annotationEnd: 5 })
    const b = component({ elementIndex: 0, annotationStart: 2, annotationEnd: 5 })
    expect(annotationComponentsShareSegment(a, b)).toBe(true)
  })

  it('returns false for different offsets or elements', () => {
    const a = component({ elementIndex: 0, annotationStart: 2, annotationEnd: 5 })
    expect(annotationComponentsShareSegment(a, component({ elementIndex: 0, annotationStart: 2, annotationEnd: 6 }))).toBe(false)
    expect(annotationComponentsShareSegment(a, component({ elementIndex: 1, annotationStart: 2, annotationEnd: 5 }))).toBe(false)
  })

  it('returns false when either side is missing', () => {
    expect(annotationComponentsShareSegment(null, component())).toBe(false)
    expect(annotationComponentsShareSegment(component(), undefined)).toBe(false)
  })
})
