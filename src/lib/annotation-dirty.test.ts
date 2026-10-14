import type {
  CurrentAnnotation,
  DocumentAnnotation,
  DocumentAnnotationComponent,
} from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  clearIfStillCurrent,
  cloneAsNewAnnotation,
  computeHasUnsavedChanges,
  resolveSwitchOutcome,
  serializeAnnotationForDirtyCheck,
} from './annotation-dirty'

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
    annotationEnd: 4,
    annotationRow: null,
    annotationCell: null,
    annotationValue: 'word',
    annotationType: 'text',
    annotationTag: 'subject',
    elementIndex: 0,
    ...overrides,
  }
}

function savedAnnotation(overrides: Partial<DocumentAnnotation> = {}): DocumentAnnotation {
  return {
    id: 'a1',
    subjectId: 's1',
    predicateId: 'p1',
    objectId: 'o1',
    annotationId: null,
    documentId: 'd1',
    corpusId: null,
    subject: component({ annotationTag: 'subject' }),
    predicate: component({ id: 'c2', annotationTag: 'predicate' }),
    object: component({ id: 'c3', annotationTag: 'object' }),
    qualifiers: [],
    ...overrides,
  }
}

describe('serializeAnnotationForDirtyCheck', () => {
  it('returns null for null', () => {
    expect(serializeAnnotationForDirtyCheck(null)).toBeNull()
  })

  it('pins the serialized field set, key order, and null normalization', () => {
    const annotation: CurrentAnnotation = {
      id: 'a1',
      subject: component({
        entityLabel: 'Douglas Adams',
        entityValue: 'Q42',
        entityCustom: false,
        entityDatatype: null,
      }),
    }

    expect(serializeAnnotationForDirtyCheck(annotation)).toBe(
      '{"id":"a1","subject":{"id":"c1","entityLabel":"Douglas Adams","entityValue":"Q42","entityCustom":false,"entityCustomId":null,"entityDatatype":null,"unit":null,"quantityLowerBound":null,"quantityUpperBound":null,"annotationStart":0,"annotationEnd":4,"annotationRow":null,"annotationCell":null,"annotationValue":"word","annotationType":"text","annotationTag":"subject","elementIndex":0},"predicate":null,"object":null,"qualifiers":[]}',
    )
  })

  it('normalizes undefined optional fields to null', () => {
    const annotation: CurrentAnnotation = {
      subject: component({ entityLabel: undefined, unit: undefined }),
    }
    const serialized = serializeAnnotationForDirtyCheck(annotation)
    expect(serialized).toContain('"entityLabel":null')
    expect(serialized).toContain('"unit":null')
    expect(serialized).toContain('"id":null')
  })

  it('produces identical output for structurally identical annotations', () => {
    const one: CurrentAnnotation = savedAnnotation()
    const two: CurrentAnnotation = savedAnnotation()
    expect(serializeAnnotationForDirtyCheck(one)).toBe(serializeAnnotationForDirtyCheck(two))
  })

  it('distinguishes changed entity values and changed ids', () => {
    const base = savedAnnotation()
    const edited = savedAnnotation({
      object: component({ id: 'c3', annotationTag: 'object', entityValue: 'Q5' }),
    })
    expect(serializeAnnotationForDirtyCheck(base)).not.toBe(serializeAnnotationForDirtyCheck(edited))

    const other = savedAnnotation({ id: 'a2' })
    expect(serializeAnnotationForDirtyCheck(base)).not.toBe(serializeAnnotationForDirtyCheck(other))
  })

  it('sorts qualifiers by position regardless of array order', () => {
    const first = { id: 'q1', position: 0, predicate: component({ annotationTag: 'qualifier-predicate' }), value: component({ id: 'c4', annotationTag: 'qualifier-value' }) }
    const second = { id: 'q2', position: 1, predicate: component({ id: 'c5', annotationTag: 'qualifier-predicate' }), value: undefined }
    const ordered: CurrentAnnotation = { qualifiers: [first, second] }
    const shuffled: CurrentAnnotation = { qualifiers: [second, first] }

    const orderedSerialized = serializeAnnotationForDirtyCheck(ordered)
    expect(orderedSerialized).toBe(serializeAnnotationForDirtyCheck(shuffled))
    expect(orderedSerialized).toContain('q1')
    expect(orderedSerialized).toContain('q2')
    expect(orderedSerialized!.indexOf('q1')).toBeLessThan(orderedSerialized!.indexOf('q2'))
  })
})

describe('computeHasUnsavedChanges', () => {
  it('is false for a null annotation', () => {
    expect(computeHasUnsavedChanges(null, null)).toBe(false)
    expect(computeHasUnsavedChanges(null, '{}')).toBe(false)
  })

  it('treats an id-less annotation as always dirty', () => {
    const annotation: CurrentAnnotation = { subject: component() }
    expect(computeHasUnsavedChanges(annotation, null)).toBe(true)
    expect(computeHasUnsavedChanges(annotation, serializeAnnotationForDirtyCheck(annotation))).toBe(true)
  })

  it('is clean when an id-bearing annotation matches its baseline snapshot', () => {
    const annotation: CurrentAnnotation = savedAnnotation()
    expect(computeHasUnsavedChanges(annotation, serializeAnnotationForDirtyCheck(annotation))).toBe(false)
  })

  it('is dirty when an id-bearing annotation differs from its baseline snapshot', () => {
    const annotation: CurrentAnnotation = savedAnnotation({
      object: component({ id: 'c3', annotationTag: 'object', entityValue: 'Q5' }),
    })
    const baseline = serializeAnnotationForDirtyCheck(savedAnnotation())
    expect(computeHasUnsavedChanges(annotation, baseline)).toBe(true)
  })

  it('is clean when an id-bearing annotation has no baseline yet', () => {
    const annotation: CurrentAnnotation = savedAnnotation()
    expect(computeHasUnsavedChanges(annotation, null)).toBe(false)
  })
})

describe('clearIfStillCurrent', () => {
  it('clears an updated annotation that is still open', () => {
    const saved = savedAnnotation({ id: 'a1' })
    expect(clearIfStillCurrent(savedAnnotation({ id: 'a1' }), saved)).toBeNull()
  })

  it('keeps the current annotation when the user switched mid-save', () => {
    const saved = savedAnnotation({ id: 'a1' })
    const other = savedAnnotation({ id: 'a2' })
    expect(clearIfStillCurrent(other, saved)).toBe(other)
  })

  it('clears a created annotation that is still open', () => {
    const draft: CurrentAnnotation = { subject: component() }
    expect(clearIfStillCurrent(draft, draft)).toBeNull()
  })

  it('keeps the current annotation when it is not the saved draft', () => {
    const draft: CurrentAnnotation = { subject: component() }
    const other: CurrentAnnotation = { subject: component({ id: 'c9' }) }
    expect(clearIfStillCurrent(other, draft)).toBe(other)
  })
})

describe('cloneAsNewAnnotation', () => {
  it('drops the annotation id and regenerates component ids', () => {
    const source = savedAnnotation({
      qualifiers: [{
        id: 'q1',
        annotationId: 'a1',
        predicateId: 'qp1',
        valueId: 'qv1',
        position: 0,
        predicate: component({ annotationTag: 'qualifier-predicate' }),
        value: component({ id: 'c4', annotationTag: 'qualifier-value' }),
      }],
    })

    const cloned = cloneAsNewAnnotation(source)

    expect('id' in cloned).toBe(false)
    expect(cloned.subject).toBeDefined()
    expect(cloned.subject!.id).not.toBe(source.subject.id)
    expect(cloned.predicate!.id).not.toBe(source.predicate.id)
    expect(cloned.object!.id).not.toBe(source.object.id)
    expect(cloned.qualifiers![0].id).not.toBe('q1')
    expect(cloned.qualifiers![0].predicate!.id).not.toBe(source.qualifiers[0].predicate.id)
    expect(cloned.qualifiers![0].value!.id).not.toBe(source.qualifiers[0].value.id)
  })

  it('keeps positions, text, and entity payloads', () => {
    const source = savedAnnotation({
      object: component({ id: 'c3', annotationTag: 'object', entityValue: 'Q5', entityLabel: 'book' }),
      qualifiers: [{
        id: 'q1',
        annotationId: 'a1',
        predicateId: 'qp1',
        valueId: 'qv1',
        position: 0,
        predicate: component({ annotationTag: 'qualifier-predicate', annotationValue: 'part of' }),
        value: component({ id: 'c4', annotationTag: 'qualifier-value', annotationValue: 'series' }),
      }],
    })

    const cloned = cloneAsNewAnnotation(source)

    expect(cloned.qualifiers![0].position).toBe(0)
    expect(cloned.object!.annotationValue).toBe('word')
    expect(cloned.object!.entityValue).toBe('Q5')
    expect(cloned.object!.entityLabel).toBe('book')
    expect(cloned.qualifiers![0].predicate!.annotationValue).toBe('part of')
    expect(cloned.qualifiers![0].value!.annotationValue).toBe('series')
  })

  it('omits qualifiers when the source has none defined', () => {
    const source: CurrentAnnotation = { subject: component() }
    const cloned = cloneAsNewAnnotation(source)
    expect('qualifiers' in cloned).toBe(false)
  })
})

describe('resolveSwitchOutcome', () => {
  it('applies clean switches', () => {
    expect(resolveSwitchOutcome({ hasUnsavedChanges: false })).toBe('apply')
  })

  it('stashes dirty switches so the discard dialog can decide', () => {
    expect(resolveSwitchOutcome({ hasUnsavedChanges: true })).toBe('stash')
  })

  it('applies in read-only even when dirty: no dialog can be rendered there', () => {
    expect(resolveSwitchOutcome({ hasUnsavedChanges: true, readOnly: true })).toBe('apply')
    expect(resolveSwitchOutcome({ hasUnsavedChanges: false, readOnly: true })).toBe('apply')
  })
})
