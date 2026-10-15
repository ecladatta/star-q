'use client'
import type { ReactNode } from 'react'
import type { DocumentAnnotation } from '@/types/types'
import { AnnotationSummary } from './annotation-summary'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'

type AnnotationHoverCardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  annotations: readonly DocumentAnnotation[]
  children: ReactNode
  side?: 'top' | 'bottom'
  onOpenAnnotation: (annotation: DocumentAnnotation) => void
}

// closeDelay stays below openDelay so sweeping the pointer across adjacent
// marks closes the previous card before the next one opens; two cards never
// show at once.
//
// Both trigger guards veto Radix's open through preventDefault:
// HoverCardTrigger composes the handler first and skips context.onOpen when
// the event is defaultPrevented (verified in @radix-ui/react-hover-card@1.1.23
// and @radix-ui/primitive@1.1.7). A held pointer button means a drag-selection
// is crossing the mark, so the card must not open mid-drag; vetoing focus
// keeps the card pointer-only, leaves Tab+Enter → click popover as the
// keyboard path, and kills the focus ghost of touch taps.
export function AnnotationHoverCard({ open, onOpenChange, annotations, children, side = 'top', onOpenAnnotation }: AnnotationHoverCardProps) {
  return (
    <HoverCard open={open} onOpenChange={onOpenChange} openDelay={300} closeDelay={150}>
      <HoverCardTrigger
        asChild
        onPointerEnter={(event) => {
          if (event.buttons !== 0) {
            event.preventDefault()
          }
        }}
        onFocus={event => event.preventDefault()}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent side={side} className="w-fit max-w-96">
        <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
          {annotations.map(annotation => (
            <button
              key={annotation.id}
              type="button"
              className="block w-full cursor-pointer rounded-md px-1 py-0.5 text-left hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
              onClick={() => {
                onOpenAnnotation(annotation)
                onOpenChange(false)
              }}
            >
              <AnnotationSummary annotation={annotation} />
            </button>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
