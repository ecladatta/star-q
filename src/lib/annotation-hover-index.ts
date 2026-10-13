import type { DocumentAnnotation, DocumentAnnotationComponent, DocumentElement } from '@/types/types'
import { getAnnotationComponents } from './annotation-roles'

export type ComponentHoverIndex = ReadonlyMap<string, readonly DocumentAnnotation[]>

export const EMPTY_ANNOTATIONS: readonly DocumentAnnotation[] = []

export function segmentKeyOf(component: DocumentAnnotationComponent): string {
  return [
    component.elementIndex,
    component.annotationRow ?? '',
    component.annotationCell ?? '',
    component.annotationStart,
    component.annotationEnd,
  ].join(':')
}

export function buildComponentHoverIndex(
  annotations: readonly DocumentAnnotation[],
  elements: readonly DocumentElement[],
): ComponentHoverIndex {
  const buckets = new Map<string, DocumentAnnotation[]>()

  for (const annotation of annotations) {
    const keys = new Set<string>()
    for (const component of getAnnotationComponents(annotation)) {
      keys.add(segmentKeyOf(component))
    }
    for (const key of keys) {
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.push(annotation)
      } else {
        buckets.set(key, [annotation])
      }
    }
  }

  const index = new Map<string, readonly DocumentAnnotation[]>()
  for (const element of elements) {
    for (const component of element.components) {
      const bucket = buckets.get(segmentKeyOf(component))
      if (bucket) {
        index.set(component.id, bucket)
      }
    }
  }

  return index
}
