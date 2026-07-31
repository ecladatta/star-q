import type { AnnotationComponentRole } from '@/types/types'

export const TYPE_TO_COLOR: Record<AnnotationComponentRole, string> = {
  'subject': '#FFE4B5',
  'predicate': '#ADD8E6',
  'object': '#90EE90',
  'qualifier-predicate': '#BFDBFE',
  'qualifier-value': '#DDD6FE',
}
