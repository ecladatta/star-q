import type { PopoverState } from '@/hooks/useSelectionState'
import type { DocumentAnnotation, EntityType } from '@/types/types'
import { PopoverClose } from '@radix-ui/react-popover'
import { BoxIcon, EditIcon, LinkIcon, Loader2Icon, TextSelectIcon, Trash2Icon, UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { DocumentPopoverAnchor } from './document-popover-anchor'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

type QualifierSide = 'predicate' | 'value'

const QUALIFIER_ACTIONS = [
  {
    side: 'predicate',
    label: 'Q predicate',
    color: TYPE_TO_COLOR['qualifier-predicate'],
  },
  {
    side: 'value',
    label: 'Q value',
    color: TYPE_TO_COLOR['qualifier-value'],
  },
] satisfies Array<{ side: QualifierSide, label: string, color: string }>

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
                              className="border-red-400 text-red-500 hover:text-red-500 focus-visible:ring-red-500"
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
                  <div className="mx-1 border-l border-gray-300" />
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-50 focus-visible:ring-orange-500"
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
                    className="flex-1 border-blue-400 text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-500"
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
                    className="flex-1 border-green-400 text-green-700 hover:bg-green-50 focus-visible:ring-green-500"
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
                        className="h-8 justify-center gap-1.5 px-2 text-xs font-medium text-slate-800 hover:opacity-90"
                        style={{ backgroundColor: action.color }}
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
