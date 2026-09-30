import type { AnnotationExport, DocumentAnnotationQualifierExport } from '@/types/types'

// Every export format renders qualifiers in fixed position order.
export function sortedQualifiers(
  annotation: AnnotationExport,
): DocumentAnnotationQualifierExport[] {
  return (annotation.qualifiers ?? [])
    .toSorted((left, right) => left.position - right.position)
}
