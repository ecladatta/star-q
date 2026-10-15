'use client'
import type { ReactNode } from 'react'
import type { DocumentAnnotation, DocumentElement } from '@/types/types'
import { createContext, use, useMemo } from 'react'
import { buildComponentHoverIndex, EMPTY_ANNOTATIONS } from '@/lib/annotation-hover-index'

type MarkHoverValue = {
  getAnnotationsForComponent: (componentId: string) => readonly DocumentAnnotation[]
  sharedPopoverOpen: boolean
  onOpenAnnotation: (annotation: DocumentAnnotation) => void
}

const MarkHoverContext = createContext<MarkHoverValue | null>(null)

export function MarkHoverProvider({
  documentAnnotations,
  documentElements,
  sharedPopoverOpen,
  onOpenAnnotation,
  children,
}: {
  documentAnnotations: readonly DocumentAnnotation[]
  documentElements: readonly DocumentElement[]
  sharedPopoverOpen: boolean
  onOpenAnnotation: (annotation: DocumentAnnotation) => void
  children: ReactNode
}) {
  const index = useMemo(
    () => buildComponentHoverIndex(documentAnnotations, documentElements),
    [documentAnnotations, documentElements],
  )

  const value = useMemo<MarkHoverValue>(() => ({
    getAnnotationsForComponent: componentId => index.get(componentId) ?? EMPTY_ANNOTATIONS,
    sharedPopoverOpen,
    onOpenAnnotation,
  }), [index, sharedPopoverOpen, onOpenAnnotation])

  return <MarkHoverContext value={value}>{children}</MarkHoverContext>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook must live beside the context it reads
export function useMarkHover() {
  const context = use(MarkHoverContext)
  if (!context) {
    throw new Error('useMarkHover must be used within MarkHoverProvider')
  }
  return context
}
