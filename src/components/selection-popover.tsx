import type { PopoverState } from '@/hooks/useSelectionState'
import type { DocumentAnnotation, EntityType } from '@/types/types'
import { BoxIcon, CopyIcon, EditIcon, LinkIcon, Loader2Icon, TextSelectIcon, Trash2Icon, UserIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { AnnotationSummary } from './annotation-summary'
import { DocumentPopoverAnchor } from './document-popover-anchor'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

type QualifierSide = 'predicate' | 'value'

const QUALIFIER_ACTIONS = [
  {
    side: 'predicate',
    label: 'Q predicate',
    className: 'bg-qualifier-soft text-qualifier-fg hover:bg-qualifier-soft/70',
  },
  {
    side: 'value',
    label: 'Q value',
    className: 'bg-qualifier-soft text-qualifier-fg hover:bg-qualifier-soft/70',
  },
] satisfies Array<{ side: QualifierSide, label: string, className: string }>

const NO_ANNOTATIONS: DocumentAnnotation[] = []

type SelectionPopoverProps = {
  popoverState: PopoverState
  /** Saved annotations sharing the clicked mention. Empty for fresh selections. */
  annotations?: DocumentAnnotation[]
  onClose: () => void
  onEditAnnotation: (annotation: DocumentAnnotation) => void
  onCloneAnnotation: (annotation: DocumentAnnotation) => void
  onDeleteAnnotation: (annotationId: string) => void
  isDeletingAnnotation: boolean
  onMentionAssociation: (type: EntityType, modifiers?: { shift?: boolean }) => void
  onQualifierSelectionAssociation: (side: QualifierSide) => void
  hasCurrentAnnotation: boolean
  keepOnModifierOutside?: boolean
  keepOnTriggerSelector?: string
}

export function SelectionPopover({
  popoverState,
  annotations = NO_ANNOTATIONS,
  onClose,
  onEditAnnotation,
  onCloneAnnotation,
  onDeleteAnnotation,
  isDeletingAnnotation,
  onMentionAssociation,
  onQualifierSelectionAssociation,
  hasCurrentAnnotation,
  keepOnModifierOutside,
  keepOnTriggerSelector,
}: SelectionPopoverProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!popoverState.visible)
    return null

  const handleDelete = async (annotationId: string) => {
    setDeletingId(annotationId)
    try {
      await onDeleteAnnotation(annotationId)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div onFocusCapture={(e) => {
      e.stopPropagation()
    }}
    >
      <TooltipProvider delayDuration={200} disableHoverableContent>
        <Popover open={popoverState.visible} onOpenChange={open => !open && onClose()}>
          <DocumentPopoverAnchor
            top={popoverState.top}
            left={popoverState.left}
            width={popoverState.anchorWidth}
            height={popoverState.anchorHeight}
          />
          <PopoverContent
            className={cn(
              'max-w-[calc(100vw-1rem)]',
              annotations.length > 0 ? 'w-fit min-w-96' : 'w-auto',
            )}
            side="top"
            sideOffset={8}
            collisionPadding={12}
            onInteractOutside={(event) => {
              const originalEvent = event instanceof CustomEvent ? event.detail.originalEvent : null
              const target = originalEvent?.target instanceof Element ? originalEvent.target : null
              if (keepOnTriggerSelector && target?.closest(keepOnTriggerSelector)) {
                // Interacting with a batch selection trigger must not dismiss
                // the role popover; the trigger's own click restages the
                // selection and re-anchors the popover.
                event.preventDefault()
                return
              }
              if (keepOnModifierOutside && originalEvent && 'ctrlKey' in originalEvent) {
                const pointerEvent = originalEvent as PointerEvent
                if (pointerEvent.ctrlKey || pointerEvent.metaKey) {
                  event.preventDefault()
                }
              }
            }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-subject/50 text-subject-fg hover:bg-subject-soft/50 focus-visible:ring-subject"
                  onClick={e => onMentionAssociation('subject', { shift: e.shiftKey })}
                >
                  <UserIcon />
                  <span>
                    <u>S</u>
                    ubject
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-predicate/50 text-predicate-fg hover:bg-predicate-soft/50 focus-visible:ring-predicate"
                  onClick={e => onMentionAssociation('predicate', { shift: e.shiftKey })}
                >
                  <LinkIcon />
                  <span>
                    <u>P</u>
                    redicate
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-object/50 text-object-fg hover:bg-object-soft/50 focus-visible:ring-object"
                  onClick={e => onMentionAssociation('object', { shift: e.shiftKey })}
                >
                  <BoxIcon />
                  <span>
                    <u>O</u>
                    bject
                  </span>
                </Button>
              </div>
              {hasCurrentAnnotation && (
                <div className="grid grid-cols-2 gap-2 border-t border-dashed pt-2">
                  {QUALIFIER_ACTIONS.map(action => (
                    <Button
                      key={action.side}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn('h-8 justify-center gap-1.5 px-2 text-xs font-medium', action.className)}
                      onClick={() => onQualifierSelectionAssociation(action.side)}
                    >
                      <TextSelectIcon className="size-3.5" />
                      <span>{action.label}</span>
                    </Button>
                  ))}
                </div>
              )}
              {annotations.length > 0 && (
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto border-t border-dashed pt-2">
                  {annotations.map(annotation => (
                    <div
                      key={annotation.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/50"
                    >
                      <AnnotationSummary annotation={annotation} />
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              aria-label="Edit annotation"
                              onClick={() => onEditAnnotation(annotation)}
                            >
                              <EditIcon className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit (E)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              aria-label="Clone annotation"
                              onClick={() => onCloneAnnotation(annotation)}
                            >
                              <CopyIcon className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clone (C)</TooltipContent>
                        </Tooltip>
                        <Popover>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-7 p-0 text-destructive hover:text-destructive"
                                  aria-label="Delete annotation"
                                  disabled={isDeletingAnnotation || deletingId === annotation.id}
                                >
                                  {deletingId === annotation.id
                                    ? <Loader2Icon className="size-3.5 animate-spin" />
                                    : <Trash2Icon className="size-3.5" />}
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                          <PopoverContent side="top" className="w-64">
                            <div className="space-y-3">
                              <p className="text-sm">Are you sure you want to delete this annotation?</p>
                              <div className="flex justify-end gap-2">
                                <PopoverClose asChild>
                                  <Button variant="ghost" size="sm">Cancel</Button>
                                </PopoverClose>
                                <PopoverClose asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(annotation.id)}
                                    disabled={isDeletingAnnotation || deletingId === annotation.id}
                                  >
                                    {deletingId === annotation.id ? <Loader2Icon className="animate-spin" /> : 'Delete'}
                                  </Button>
                                </PopoverClose>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    </div>
  )
}
