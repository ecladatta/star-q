import type {
  CurrentAnnotation,
  DocumentAnnotation,
  DocumentAnnotationComponent,
} from '@/types/types'
import { v4 as uuidv4 } from 'uuid'

function normalizeComponentForDirtyCheck(
  component: DocumentAnnotationComponent | undefined,
) {
  if (!component) {
    return null
  }

  return {
    id: component.id,
    entityLabel: component.entityLabel ?? null,
    entityValue: component.entityValue ?? null,
    entityCustom: component.entityCustom ?? null,
    entityCustomId: component.entityCustomId ?? null,
    entityDatatype: component.entityDatatype ?? null,
    unit: component.unit ?? null,
    quantityLowerBound: component.quantityLowerBound ?? null,
    quantityUpperBound: component.quantityUpperBound ?? null,
    annotationStart: component.annotationStart,
    annotationEnd: component.annotationEnd,
    annotationRow: component.annotationRow,
    annotationCell: component.annotationCell,
    annotationValue: component.annotationValue,
    annotationType: component.annotationType,
    annotationTag: component.annotationTag,
    elementIndex: component.elementIndex,
  }
}

export function serializeAnnotationForDirtyCheck(
  annotation: CurrentAnnotation | null,
) {
  if (!annotation) {
    return null
  }

  return JSON.stringify({
    id: annotation.id ?? null,
    subject: normalizeComponentForDirtyCheck(annotation.subject),
    predicate: normalizeComponentForDirtyCheck(annotation.predicate),
    object: normalizeComponentForDirtyCheck(annotation.object),
    qualifiers: (annotation.qualifiers ?? [])
      .map(qualifier => ({
        id: qualifier.id,
        position: qualifier.position,
        predicate: normalizeComponentForDirtyCheck(qualifier.predicate),
        value: normalizeComponentForDirtyCheck(qualifier.value),
      }))
      .sort((a, b) => a.position - b.position),
  })
}

export function computeHasUnsavedChanges(
  annotation: CurrentAnnotation | null,
  baselineSnapshot: string | null,
): boolean {
  return Boolean(
    annotation
    && (!annotation.id
      || (baselineSnapshot !== null
        && serializeAnnotationForDirtyCheck(annotation) !== baselineSnapshot)),
  )
}

export function clearIfStillCurrent(
  prev: CurrentAnnotation | null,
  saved: CurrentAnnotation | null,
): CurrentAnnotation | null {
  if (saved?.id) {
    return prev?.id === saved.id ? null : prev
  }
  return prev === saved ? null : prev
}

export type SwitchOutcome = 'apply' | 'stash'

export function resolveSwitchOutcome(input: {
  readOnly?: boolean
  hasUnsavedChanges: boolean
}): SwitchOutcome {
  if (input.readOnly || !input.hasUnsavedChanges) {
    return 'apply'
  }
  return 'stash'
}

export function cloneAsNewAnnotation(
  annotation: CurrentAnnotation | DocumentAnnotation,
): CurrentAnnotation {
  const cloneComponent = (
    comp: DocumentAnnotationComponent | undefined,
  ): DocumentAnnotationComponent | undefined => {
    if (!comp) {
      return undefined
    }
    return {
      ...comp,
      id: uuidv4(),
    }
  }

  const cloned: CurrentAnnotation = {
    subject: cloneComponent(annotation.subject),
    predicate: cloneComponent(annotation.predicate),
    object: cloneComponent(annotation.object),
  }
  if (annotation.qualifiers !== undefined) {
    cloned.qualifiers = annotation.qualifiers.map(
      (qualifier, position) => ({
        id: uuidv4(),
        position,
        predicate: cloneComponent(qualifier.predicate),
        value: cloneComponent(qualifier.value),
      }),
    )
  }

  return cloned
}
