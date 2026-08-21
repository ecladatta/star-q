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

  // The annotation id we most recently WROTE to the URL (null = we wrote a clear).
  const authoredRef = useRef<string | null>(null)

  useEffect(() => {
    const { annotations: anns, currentAnnotationId: currentId, onOpen: open, onClose: close } = latestRef.current

    // Settle our own in-flight writes: the param now matches what we wrote.
    if (authoredRef.current !== null && annotationParam === authoredRef.current) {
      authoredRef.current = null
    }

    if (annotationParam === currentId) {
      return
    }

    // Our own write is still in flight; don't react to the param during the transient.
    if (authoredRef.current !== null) {
      return
    }

    if (!annotationParam) {
      close()
      return
    }

    const target = anns.find(annotation => annotation.id === annotationParam)
    if (!target) {
      return
    }

    // Mark the URL as authoritative so effect 2 doesn't write back.
    authoredRef.current = annotationParam
    open(target, true)
  }, [annotationParam])

  useEffect(() => {
    // Our own write is in flight; don't double-write.
    if (authoredRef.current !== null) {
      return
    }

    // URL says closed; never resurrect a cleared param.
    if (!annotationParam) {
      return
    }

    if (annotationParam === currentAnnotationId) {
      return
    }

    writeUrl(currentAnnotationId)
  }, [currentAnnotationId, annotationParam, writeUrl])

  const openAnnotation = useCallback((annotation: DocumentAnnotation, scroll = true) => {
    authoredRef.current = annotation.id
    onOpen(annotation, scroll)
    writeUrl(annotation.id)
  }, [onOpen, writeUrl])

  const closeAnnotation = useCallback(() => {
    authoredRef.current = null
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
