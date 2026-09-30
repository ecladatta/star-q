import type { AnnotationExport, DocumentAnnotationQualifierExport } from '@/types/types'

export function sortedQualifiers(
  annotation: AnnotationExport,
): DocumentAnnotationQualifierExport[] {
  return (annotation.qualifiers ?? [])
    .toSorted((left, right) => left.position - right.position)
}
