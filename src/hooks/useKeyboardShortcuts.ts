import type { DocumentAnnotation, EntityType } from '@/types/types'
import { useLayoutEffect } from 'react'

type KeyboardShortcutsConfig = {
  popoverVisible: boolean
  hasSelection: boolean
  currentAnnotation: DocumentAnnotation | null
  onAnnotationAction: (type: EntityType) => void
  onEditCurrentAnnotation: () => void
  onClearAnnotation: () => void
  onHidePopover: () => void
  onToggleAnnotations: () => void
  onCloneAnnotation: () => void
}

export function useKeyboardShortcuts({
  popoverVisible,
  hasSelection,
  currentAnnotation,
  onAnnotationAction,
  onEditCurrentAnnotation,
  onClearAnnotation,
  onHidePopover,
  onToggleAnnotations,
  onCloneAnnotation,
}: KeyboardShortcutsConfig) {
  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement

      // Ignore events in input fields
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      if (e.ctrlKey || e.altKey || e.metaKey) {
        // Ignore if Ctrl, Alt, or Meta keys are pressed
        return
      }

      const key = e.key.toLowerCase()

      // Escape key - clear annotation and hide popover
      if (key === 'escape') {
        e.preventDefault()
        onClearAnnotation()
        onHidePopover()
        return
      }

      // Annotation keys (s, p, o)
      const annotationKeyMap: Record<string, EntityType> = {
        s: 'subject',
        p: 'predicate',
        o: 'object',
      }

      if (key in annotationKeyMap) {
        e.preventDefault()
        onAnnotationAction(annotationKeyMap[key])
      }

      // Edit key (e) - only when popover is visible with annotation
      if (key === 'e' && popoverVisible && currentAnnotation) {
        e.preventDefault()
        onEditCurrentAnnotation()
      }

      // Clone key (c) - only when popover is visible with annotation
      if (key === 'c' && popoverVisible && currentAnnotation) {
        e.preventDefault()
        onCloneAnnotation()
      }

      // Toggle annotations visibility (h)
      if (key === 'h') {
        e.preventDefault()
        onToggleAnnotations()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    popoverVisible,
    hasSelection,
    currentAnnotation,
    onAnnotationAction,
    onEditCurrentAnnotation,
    onClearAnnotation,
    onHidePopover,
    onToggleAnnotations,
    onCloneAnnotation,
  ])
}
