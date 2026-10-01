import type {
  AnnotationComponentRole,
  CurrentAnnotation,
  DocumentAnnotation,
  DocumentAnnotationComponent,
  Entity,
  EntityType,
} from '@/types/types'
import { WIKIBASE_ITEM_PATTERN, WIKIBASE_PROPERTY_PATTERN } from '@/lib/wikibase-constraints'

export function entityTypeForComponentRole(role: AnnotationComponentRole): EntityType {
  if (role === 'qualifier-predicate') {
    return 'predicate'
  }
  if (role === 'qualifier-value') {
    return 'object'
  }
  return role
}

export function hasEntityLink(component: DocumentAnnotationComponent): boolean {
  if (component.entityCustom) {
    return true
  }
  if (component.entityValue === null) {
    return false
  }
  // Linked components hold a Wikibase Q-item or P-property; a quantity's
  // amount matches neither.
  return WIKIBASE_ITEM_PATTERN.test(component.entityValue)
    || WIKIBASE_PROPERTY_PATTERN.test(component.entityValue)
}

export function createEntityFromComponent(component: DocumentAnnotationComponent): Entity | null {
  if (!hasEntityLink(component)) {
    return null
  }
  return {
    label: component.entityLabel || '',
    value: component.entityValue || '',
    custom: component.entityCustom || false,
    customId: component.entityCustomId || null,
    datatype: component.entityDatatype || null,
    type: entityTypeForComponentRole(component.annotationTag),
  }
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
