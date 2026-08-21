'use client'

import type { DocumentAnnotation } from '@/types/types'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

type UseAnnotationUrlSyncOptions = {
  annotations: DocumentAnnotation[]
  currentAnnotationId: string | null
  onOpen: (annotation: DocumentAnnotation, scroll?: boolean) => void
  onClose: () => void
}

/**
 * Keeps the ?annotation= URL param in sync with the annotation currently being edited.
 */
export function useAnnotationUrlSync({
  annotations,
  currentAnnotationId,
  onOpen,
  onClose,
}: UseAnnotationUrlSyncOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const annotationParam = searchParams.get('annotation')

  const latestRef = useRef({ annotations, currentAnnotationId, onOpen, onClose })
  latestRef.current = { annotations, currentAnnotationId, onOpen, onClose }

  const writeUrl = useCallback((next: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next) {
      params.set('annotation', next)
    } else {
      params.delete('annotation')
    }
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [pathname, router, searchParams])

  const appliedParamRef = useRef<string | null>(null)

  useEffect(() => {
    const { annotations: anns, currentAnnotationId: currentId, onOpen: open } = latestRef.current
    if (!annotationParam || annotationParam === currentId) {
      return
    }

    const target = anns.find(annotation => annotation.id === annotationParam)
    if (!target) {
      return
    }

    appliedParamRef.current = annotationParam
    open(target, true)
  }, [annotationParam])

  useEffect(() => {
    if (appliedParamRef.current !== null) {
      appliedParamRef.current = null
      return
    }

    if (annotationParam === currentAnnotationId) {
      return
    }

    writeUrl(currentAnnotationId)
  }, [currentAnnotationId, annotationParam, writeUrl])

  const openAnnotation = useCallback((annotation: DocumentAnnotation, scroll = true) => {
    onOpen(annotation, scroll)
    writeUrl(annotation.id)
  }, [onOpen, writeUrl])

  const closeAnnotation = useCallback(() => {
    onClose()
    writeUrl(null)
  }, [onClose, writeUrl])

  const toggleAnnotation = useCallback((annotation: DocumentAnnotation) => {
    if (annotation.id === currentAnnotationId) {
      closeAnnotation()
    } else {
      openAnnotation(annotation)
    }
  }, [currentAnnotationId, closeAnnotation, openAnnotation])

  return { openAnnotation, closeAnnotation, toggleAnnotation }
}
