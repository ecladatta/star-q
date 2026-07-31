import type { CurrentAnnotationQualifier, DocumentAnnotationComponent } from '@/types/types'

export function validateAnnotationComponent(component: DocumentAnnotationComponent | undefined): boolean {
  return !!(
    component
    && component.annotationValue?.trim()
    && (component.elementIndex === 0 || component.elementIndex)
  )
}

export function validateAnnotationTriple(subject?: DocumentAnnotationComponent, predicate?: DocumentAnnotationComponent, object?: DocumentAnnotationComponent): string | null {
  if (!validateAnnotationComponent(subject)) {
    return 'Subject is required and must have valid text'
  }
  if (!validateAnnotationComponent(predicate)) {
    return 'Predicate is required and must have valid text'
  }
  if (!validateAnnotationComponent(object)) {
    return 'Object is required and must have valid text'
  }
  return null
}

export function validateAnnotationQualifiers(qualifiers?: CurrentAnnotationQualifier[]): string[] {
  if (!qualifiers) {
    return []
  }

  return qualifiers.flatMap((qualifier, index) => {
    const qualifierNumber = index + 1
    const hasPredicateComponent = Boolean(qualifier.predicate)
    const hasValueComponent = Boolean(qualifier.value)
    const hasPredicate = validateAnnotationComponent(qualifier.predicate)
    const hasValue = validateAnnotationComponent(qualifier.value)

    if (!hasPredicateComponent && !hasValueComponent) {
      return [`Qualifier ${qualifierNumber} is empty; remove it or fill both fields`]
    }
    if (!hasPredicate) {
      return [`Qualifier ${qualifierNumber} predicate is required`]
    }
    if (!hasValue) {
      return [`Qualifier ${qualifierNumber} value is required`]
    }
    return []
  })
}
