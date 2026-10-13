'use client'
import type { ReactNode } from 'react'
import type { DocumentAnnotation } from '@/types/types'
import { cn } from '@/lib/utils'
import { AnnotationChips } from './annotation-chips'
import { QualifierSummary } from './qualifier-summary'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'

type AnnotationHoverCardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  annotations: readonly DocumentAnnotation[]
  children: ReactNode
  side?: 'top' | 'bottom'
  onEditAnnotation?: (annotation: DocumentAnnotation) => void
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
export function AnnotationHoverCard({ open, onOpenChange, annotations, children, side = 'top', onEditAnnotation }: AnnotationHoverCardProps) {
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
          {annotations.map((annotation) => {
            const rowProps = {
              className: cn(
                'block w-full rounded-md px-1 py-0.5 text-left',
                onEditAnnotation
                && 'cursor-pointer hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
              ),
              onClick: onEditAnnotation
                ? () => {
                    onEditAnnotation(annotation)
                    onOpenChange(false)
                  }
                : undefined,
            }
            const row = (
              <>
                <AnnotationChips annotation={annotation} direction="inline" />
                <QualifierSummary qualifiers={annotation.qualifiers} className="mt-1 pt-1.5" />
              </>
            )
            return onEditAnnotation
              ? <button key={annotation.id} type="button" {...rowProps}>{row}</button>
              : <div key={annotation.id} {...rowProps}>{row}</div>
          })}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
