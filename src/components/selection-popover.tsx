import type { PopoverState } from '@/hooks/useSelectionState'
import type { DocumentAnnotation, EntityType } from '@/types/types'
import { PopoverClose } from '@radix-ui/react-popover'
import { BoxIcon, EditIcon, LinkIcon, Loader2Icon, Trash2Icon, UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

type SelectionPopoverProps = {
  popoverState: PopoverState
  onClose: () => void
  onDelete: (annotationId: string) => void
  isDeletingAnnotation: boolean
  onMentionAssociation: (type: EntityType) => void
  onEditAnnotation: (annotation: DocumentAnnotation) => void
}

export function SelectionPopover({
  popoverState,
  onClose,
  onDelete,
  isDeletingAnnotation,
  onMentionAssociation,
  onEditAnnotation,
}: SelectionPopoverProps) {
  if (!popoverState.visible)
    return null

  return (
    <div onFocusCapture={(e) => {
      e.stopPropagation()
    }}
    >
      <Popover open={popoverState.visible} onOpenChange={onClose}>
        <PopoverTrigger asChild>
          <div
            style={{
              position: 'absolute',
              top: popoverState.top,
              left: popoverState.left,
              zIndex: 1000,
            }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto">
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
                  className="border-orange-400 focus-visible:ring-orange-500"
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
                  className="border-blue-400 focus-visible:ring-blue-500"
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
                  className="border-green-400 focus-visible:ring-green-500"
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
        </PopoverContent>
      </Popover>
    </div>
  )
}
