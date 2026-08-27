import type { AnnotationComponentRole } from '@/types/types'

export const MAX_OWNED_TEAMS_PER_USER = 10
export const MAX_OWNED_CORPORA_PER_USER = 20
export const MAX_CORPORA_PER_TEAM = 100
export const MAX_IMPORT_FILE_SIZE_BYTES = 100 * 1024 * 1024
export const MAX_IMPORT_UNCOMPRESSED_BYTES = 500 * 1024 * 1024
export const MAX_DOCUMENTS_PER_IMPORT = 10000
export const MAX_ANNOTATIONS_PER_DOCUMENT = 10000
export const MAX_CUSTOM_ENTITIES_PER_CORPUS = 5000
export const MAX_PENDING_INVITES_PER_TEAM = 20
export const MAX_PENDING_INVITES_PER_CORPUS = 20

export const TYPE_TO_COLOR: Record<AnnotationComponentRole, string> = {
  'subject': '#FFE4B5',
  'predicate': '#ADD8E6',
  'object': '#90EE90',
  'qualifier-predicate': '#BFDBFE',
  'qualifier-value': '#DDD6FE',
}
