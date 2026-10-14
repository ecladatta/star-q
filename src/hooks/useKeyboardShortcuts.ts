import type { CurrentAnnotation, DocumentAnnotation, EntityType } from '@/types/types'
import { useLayoutEffect } from 'react'

type KeyboardShortcutsConfig = {
  batchHasMentions: boolean
  hasInProgressAnnotation: boolean
  /** Saved annotations on the clicked mention, listed in the visible popover. */
  popoverAnnotations: readonly DocumentAnnotation[]
  currentAnnotation: CurrentAnnotation | DocumentAnnotation | null
  cloneDisabled: boolean
  onAnnotationAction: (type: EntityType, modifiers?: { shift?: boolean }) => void
  onEditAnnotation: (annotation: DocumentAnnotation) => void
  onCloneAnnotation: (annotation: CurrentAnnotation | DocumentAnnotation) => void
  onClearAnnotation: () => void
  onHidePopover: () => void
  onToggleAnnotations: () => void
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
  batchHasMentions,
  hasInProgressAnnotation,
  popoverAnnotations,
  currentAnnotation,
  cloneDisabled,
  onAnnotationAction,
  onEditAnnotation,
  onCloneAnnotation,
  onClearAnnotation,
  onHidePopover,
  onToggleAnnotations,
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

      if (key === 'e' && popoverAnnotations.length > 0) {
        e.preventDefault()
        onEditAnnotation(popoverAnnotations[0])
      }

      const cloneTarget = popoverAnnotations[0] ?? (currentAnnotation?.id ? currentAnnotation : null)
      if (key === 'c' && cloneTarget && !cloneDisabled) {
        e.preventDefault()
        onCloneAnnotation(cloneTarget)
      }

      if (key === 'h') {
        e.preventDefault()
        onToggleAnnotations()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    batchHasMentions,
    hasInProgressAnnotation,
    popoverAnnotations,
    currentAnnotation,
    cloneDisabled,
    onAnnotationAction,
    onEditAnnotation,
    onCloneAnnotation,
    onClearAnnotation,
    onHidePopover,
    onToggleAnnotations,
    onCancelBatchDrag,
    onExitBatchMode,
  ])
}
