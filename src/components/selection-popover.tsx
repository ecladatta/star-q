import type { PopoverState } from '@/hooks/useAnnotationState'
import type { DocumentAnnotation, EntityType } from '@/types/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { BoxIcon, EditIcon, LinkIcon, UserIcon } from 'lucide-react'

type SelectionPopoverProps = {
  popoverState: PopoverState
  onClose: () => void
  onMentionAssociation: (type: EntityType) => void
  onEditAnnotation: (annotation: DocumentAnnotation) => void
}

export function SelectionPopover({
  popoverState,
  onClose,
  onMentionAssociation,
  onEditAnnotation,
}: SelectionPopoverProps) {
  if (!popoverState.visible)
    return null

  return (
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
            <Button
              variant="outline"
              onClick={() => onEditAnnotation(popoverState.annotation!)}
            >
              <EditIcon />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            className="border-orange-400 focus-visible:ring-orange-500"
            onClick={() => onMentionAssociation('subject')}
          >
            <UserIcon />
            {' '}
            Subject
          </Button>
          <Button
            variant="outline"
            className="border-blue-400 focus-visible:ring-blue-500"
            onClick={() => onMentionAssociation('predicate')}
          >
            <LinkIcon />
            {' '}
            Predicate
          </Button>
          <Button
            variant="outline"
            className="border-green-400 focus-visible:ring-green-500"
            onClick={() => onMentionAssociation('object')}
          >
            <BoxIcon />
            {' '}
            Object
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
