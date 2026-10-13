import type { DocumentAnnotation, DocumentAnnotationComponent, DocumentElement } from '@/types/types'
import { describe, expect, it } from 'vitest'
import { buildComponentHoverIndex, segmentKeyOf } from './annotation-hover-index'
import { annotationComponentsShareSegment } from './utils'

function component(overrides: Partial<DocumentAnnotationComponent> = {}): DocumentAnnotationComponent {
  return {
    id: 'c1',
    entityLabel: null,
    entityValue: null,
    entityCustom: null,
    entityCustomId: null,
    entityDatatype: null,
    unit: null,
    quantityLowerBound: null,
    quantityUpperBound: null,
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

describe('segmentKeyOf', () => {
  it('serializes null row and cell as empty fields', () => {
    expect(segmentKeyOf(component())).toBe('0:::0:1')
  })

  it('serializes table segments with row and cell', () => {
    expect(segmentKeyOf(component({ annotationRow: 2, annotationCell: 4 }))).toBe('0:2:4:0:1')
  })
})

describe('segmentKeyOf matches annotationComponentsShareSegment', () => {
  it('holds for identical segments and every single-field difference', () => {
    const pairs: Array<{ a: Partial<DocumentAnnotationComponent>, b: Partial<DocumentAnnotationComponent>, share: boolean }> = [
      { a: {}, b: {}, share: true },
      { a: {}, b: { elementIndex: 1 }, share: false },
      { a: {}, b: { annotationStart: 1 }, share: false },
      { a: {}, b: { annotationEnd: 2 }, share: false },
      { a: {}, b: { annotationRow: 1 }, share: false },
      { a: {}, b: { annotationCell: 1 }, share: false },
      { a: {}, b: { annotationRow: 0 }, share: false },
      { a: {}, b: { annotationCell: 0 }, share: false },
      { a: { annotationRow: 2 }, b: { annotationRow: 2 }, share: true },
      { a: { annotationRow: 2 }, b: { annotationRow: 3 }, share: false },
      { a: { annotationCell: 4 }, b: { annotationCell: 4 }, share: true },
      { a: { annotationCell: 4 }, b: { annotationCell: 5 }, share: false },
      { a: { annotationRow: 2, annotationCell: 4 }, b: { annotationRow: 2, annotationCell: 4 }, share: true },
      { a: { annotationRow: 2 }, b: { annotationRow: 2, annotationCell: 4 }, share: false },
    ]

    for (const { a, b, share } of pairs) {
      const left = component(a)
      const right = component(b)
      expect(annotationComponentsShareSegment(left, right)).toBe(share)
      expect(segmentKeyOf(left) === segmentKeyOf(right)).toBe(share)
    }
  })
})

describe('buildComponentHoverIndex', () => {
  it('indexes each rendered component with the annotations sharing its segment', () => {
    const a1 = annotation({ id: 'a1' })
    const a2 = annotation({ id: 'a2' })
    const elements: DocumentElement[] = [
      { components: [a1.subject, a2.object], value: '' },
    ]

    const index = buildComponentHoverIndex([a1, a2], elements)

    expect(index.get(a1.subject.id)).toEqual([a1, a2])
    expect(index.get(a2.object.id)).toEqual([a1, a2])
  })

  it('dedupes one annotation covering one segment through several of its own components', () => {
    const a1 = annotation()
    const elements: DocumentElement[] = [
      { components: [a1.subject, a1.object], value: '' },
    ]

    const index = buildComponentHoverIndex([a1], elements)

    expect(index.get(a1.subject.id)).toEqual([a1])
    expect(index.get(a1.object.id)).toEqual([a1])
  })

  it('omits components whose id is not backed by an annotation segment', () => {
    const a1 = annotation()
    const staged = component({ id: 'staged-1', annotationStart: 10, annotationEnd: 12 })
    const elements: DocumentElement[] = [
      { components: [a1.subject, staged], value: '' },
    ]

    const index = buildComponentHoverIndex([a1], elements)

    expect(index.get(a1.subject.id)).toEqual([a1])
    expect(index.has('staged-1')).toBe(false)
  })

  it('omits annotations that render no component in the elements', () => {
    const a1 = annotation()
    const index = buildComponentHoverIndex([a1], [{ components: [], value: '' }])

    expect(index.size).toBe(0)
  })
})
