import type {
  CurrentAnnotationQualifier,
  DocumentAnnotationComponent,
} from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  validateAnnotationComponent,
  validateAnnotationQualifiers,
  validateAnnotationTriple,
} from './annotation-validation'

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

function qualifier(overrides: Partial<CurrentAnnotationQualifier> = {}): CurrentAnnotationQualifier {
  return {
    id: 'q1',
    position: 0,
    predicate: component({ annotationTag: 'qualifier-predicate' }),
    value: component({ annotationTag: 'qualifier-value' }),
    ...overrides,
  }
}

describe('validateAnnotationComponent', () => {
  it('accepts a component with non-empty text', () => {
    expect(validateAnnotationComponent(component())).toBe(true)
  })

  it('rejects undefined components', () => {
    expect(validateAnnotationComponent(undefined)).toBe(false)
  })

  it('rejects blank annotation values', () => {
    expect(validateAnnotationComponent(component({ annotationValue: '   ' }))).toBe(false)
  })
})

describe('validateAnnotationTriple', () => {
  it('returns null when all parts are valid', () => {
    expect(validateAnnotationTriple(
      component({ annotationTag: 'subject' }),
      component({ annotationTag: 'predicate' }),
      component({ annotationTag: 'object' }),
    )).toBeNull()
  })

  it('reports the specific missing part', () => {
    expect(validateAnnotationTriple(undefined, component(), component()))
      .toBe('Subject is required and must have valid text')
    expect(validateAnnotationTriple(component(), undefined, component()))
      .toBe('Predicate is required and must have valid text')
    expect(validateAnnotationTriple(component(), component(), undefined))
      .toBe('Object is required and must have valid text')
  })

  it('reports the first invalid part only', () => {
    expect(validateAnnotationTriple(undefined, undefined, undefined))
      .toBe('Subject is required and must have valid text')
  })
})

describe('validateAnnotationQualifiers', () => {
  it('returns no errors for missing or valid qualifiers', () => {
    expect(validateAnnotationQualifiers()).toEqual([])
    expect(validateAnnotationQualifiers([qualifier()])).toEqual([])
  })

  it('flags an empty qualifier', () => {
    expect(validateAnnotationQualifiers([qualifier({ predicate: undefined, value: undefined })])).toEqual([
      'Qualifier 1 is empty; remove it or fill both fields',
    ])
  })

  it('flags a qualifier missing its predicate', () => {
    expect(validateAnnotationQualifiers([qualifier({ predicate: undefined })])).toEqual([
      'Qualifier 1 predicate is required',
    ])
  })

  it('flags a qualifier missing its value', () => {
    expect(validateAnnotationQualifiers([qualifier({ value: undefined })])).toEqual([
      'Qualifier 1 value is required',
    ])
  })

  it('numbers errors by qualifier index', () => {
    expect(validateAnnotationQualifiers([
      qualifier({ predicate: undefined }),
      qualifier({ value: undefined }),
    ])).toEqual([
      'Qualifier 1 predicate is required',
      'Qualifier 2 value is required',
    ])
  })
})
