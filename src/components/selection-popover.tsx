import type { PopoverState } from '@/hooks/useSelectionState'
import type { DocumentAnnotation, EntityType } from '@/types/types'
import { BoxIcon, EditIcon, LinkIcon, Loader2Icon, TextSelectIcon, Trash2Icon, UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
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

type SelectionPopoverProps = {
  popoverState: PopoverState
  onClose: () => void
  onDelete: (annotationId: string) => void
  isDeletingAnnotation: boolean
  onMentionAssociation: (type: EntityType) => void
  onQualifierSelectionAssociation: (side: QualifierSide) => void
  hasCurrentAnnotation: boolean
  onEditAnnotation: (annotation: DocumentAnnotation) => void
}

export function SelectionPopover({
  popoverState,
  onClose,
  onDelete,
  isDeletingAnnotation,
  onMentionAssociation,
  onQualifierSelectionAssociation,
  hasCurrentAnnotation,
  onEditAnnotation,
}: SelectionPopoverProps) {
  if (!popoverState.visible)
    return null

  return (
    <div onFocusCapture={(e) => {
      e.stopPropagation()
    }}
    >
      <Popover open={popoverState.visible} onOpenChange={open => !open && onClose()}>
        <DocumentPopoverAnchor
          top={popoverState.top}
          left={popoverState.left}
          width={popoverState.anchorWidth}
          height={popoverState.anchorHeight}
        />
        <PopoverContent className="w-auto max-w-[calc(100vw-1rem)]" side="top" sideOffset={8} collisionPadding={12}>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {popoverState.annotation && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => onEditAnnotation(popoverState.annotation!)}
                  >
                    <EditIcon />
                    <span>
                      <u>E</u>
                      dit
                    </span>
                  </Button>
                  <TooltipProvider delayDuration={200}>
                    <Popover>
                      <Tooltip>
                        <PopoverTrigger asChild>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-destructive/50 text-destructive hover:text-destructive focus-visible:ring-destructive"
                              data-delete-annotation-popover-trigger
                            >
                              <Trash2Icon />
                            </Button>
                          </TooltipTrigger>
                        </PopoverTrigger>
                        <TooltipContent>
                          Delete annotation (Delete)
                        </TooltipContent>
                      </Tooltip>
                      <PopoverContent side="top">
                        <form onSubmit={async (e) => {
                          e.preventDefault()
                          if (popoverState.annotation) {
                            await onDelete(popoverState.annotation.id)
                            onClose()
                          }
                        }}
                        >
                          <div className="flex flex-col items-center">
                            <p>Are you sure you want to delete this annotation?</p>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="submit"
                                variant="destructive"
                                disabled={isDeletingAnnotation}
                              >
                                {isDeletingAnnotation ? <Loader2Icon className="animate-spin" /> : 'Delete'}
                              </Button>
                              <PopoverClose asChild>
                                <Button type="button" variant="ghost" disabled={isDeletingAnnotation}>
                                  Cancel
                                </Button>
                              </PopoverClose>
                            </div>
                          </div>
                        </form>
                      </PopoverContent>
                    </Popover>
                  </TooltipProvider>
                  <div className="mx-1 border-l border-border" />
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-subject/50 text-subject-fg hover:bg-subject-soft/50 focus-visible:ring-subject"
                    onClick={() => onMentionAssociation('subject')}
                  >
                    <UserIcon />
                    {!popoverState.annotation && (
                      <span>
                        <u>S</u>
                        ubject
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  New subject
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-predicate/50 text-predicate-fg hover:bg-predicate-soft/50 focus-visible:ring-predicate"
                    onClick={() => onMentionAssociation('predicate')}
                  >
                    <LinkIcon />
                    {!popoverState.annotation && (
                      <span>
                        <u>P</u>
                        redicate
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  New predicate
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-object/50 text-object-fg hover:bg-object-soft/50 focus-visible:ring-object"
                    onClick={() => onMentionAssociation('object')}
                  >
                    <BoxIcon />
                    {!popoverState.annotation && (
                      <span>
                        <u>O</u>
                        bject
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  New object
                </TooltipContent>
              </Tooltip>
            </div>
            {hasCurrentAnnotation && (
              <div className="grid grid-cols-2 gap-2 border-t border-dashed pt-2">
                {QUALIFIER_ACTIONS.map(action => (
                  <Tooltip key={action.side}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn('h-8 justify-center gap-1.5 px-2 text-xs font-medium', action.className)}
                        onClick={() => onQualifierSelectionAssociation(action.side)}
                      >
                        <TextSelectIcon className="size-3.5" />
                        <span>{action.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {`Use selection as qualifier ${action.side}`}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
