import type {
  AnnotationComponentRole,
  CurrentAnnotation,
  DocumentAnnotation,
  DocumentAnnotationComponent,
  EntityType,
} from '@/types/types'

export function entityTypeForComponentRole(role: AnnotationComponentRole): EntityType {
  if (role === 'qualifier-predicate') {
    return 'predicate'
  }
  if (role === 'qualifier-value') {
    return 'object'
  }
  return role
}

export function getAnnotationComponents(
  annotation: DocumentAnnotation | CurrentAnnotation,
): DocumentAnnotationComponent[] {
  const baseComponents = [
    annotation.subject,
    annotation.predicate,
    annotation.object,
  ].filter((component): component is DocumentAnnotationComponent => Boolean(component))

  const qualifierComponents = (annotation.qualifiers ?? []).flatMap(qualifier => [
    qualifier.predicate,
    qualifier.value,
  ]).filter((component): component is DocumentAnnotationComponent => Boolean(component))

  return [...baseComponents, ...qualifierComponents]
}

export function getAnnotationComponentDisplayText(component: DocumentAnnotationComponent): string {
  return component.entityLabel || component.annotationValue
}

export function getAnnotationComponentTitle(component: DocumentAnnotationComponent): string {
  if (component.entityLabel && component.entityLabel !== component.annotationValue) {
    return `${component.annotationValue} (${component.entityLabel})`
  }

  return component.annotationValue
}
