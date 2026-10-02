import type { DocumentAnnotation, EntityType } from '@/types/types'
import { useLayoutEffect } from 'react'

type KeyboardShortcutsConfig = {
  popoverVisible: boolean
  hasSelection: boolean
  currentAnnotation: DocumentAnnotation | null
  batchHasMentions: boolean
  hasInProgressAnnotation: boolean
  onAnnotationAction: (type: EntityType, modifiers?: { shift?: boolean }) => void
  onEditCurrentAnnotation: () => void
  onClearAnnotation: () => void
  onHidePopover: () => void
  onToggleAnnotations: () => void
  onCloneAnnotation: () => void
  onDeleteAnnotation: () => void
  onCancelBatchDrag: () => void
  onExitBatchMode: () => void
}

export type EscapeAction = 'exit-batch' | 'clear-annotation'

export function resolveEscapeAction(input: { batchHasMentions: boolean, hasInProgressAnnotation: boolean }): EscapeAction {
  if (input.batchHasMentions && !input.hasInProgressAnnotation) {
    return 'exit-batch'
  }
  return 'clear-annotation'
}

export function useKeyboardShortcuts({
  popoverVisible,
  hasSelection,
  currentAnnotation,
  batchHasMentions,
  hasInProgressAnnotation,
  onAnnotationAction,
  onEditCurrentAnnotation,
  onClearAnnotation,
  onHidePopover,
  onToggleAnnotations,
  onCloneAnnotation,
  onDeleteAnnotation,
  onCancelBatchDrag,
  onExitBatchMode,
}: KeyboardShortcutsConfig) {
  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return
      }

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

      // The discard dialog owns its own Escape (capture).
      if (key === 'escape') {
        e.preventDefault()
        onCancelBatchDrag()
        const action = resolveEscapeAction({ batchHasMentions, hasInProgressAnnotation })
        if (action === 'exit-batch') {
          onExitBatchMode()
        } else {
          onClearAnnotation()
        }
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
        onAnnotationAction(annotationKeyMap[key], { shift: e.shiftKey })
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

      // Delete key - only when popover is visible with annotation
      if (key === 'delete' && popoverVisible && currentAnnotation) {
        e.preventDefault()
        onDeleteAnnotation()
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
    batchHasMentions,
    hasInProgressAnnotation,
    onAnnotationAction,
    onEditCurrentAnnotation,
    onClearAnnotation,
    onHidePopover,
    onToggleAnnotations,
    onCloneAnnotation,
    onDeleteAnnotation,
    onCancelBatchDrag,
    onExitBatchMode,
  ])
}
