import type { DocumentData } from '@/types/types'
import { useMemo } from 'react'
import { buildDocumentElements } from '@/lib/document-elements'

export function useDocumentElements(documentData: DocumentData | undefined) {
  return useMemo(() => buildDocumentElements(documentData), [documentData])
}
