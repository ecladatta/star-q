import type { LucideIcon } from 'lucide-react'
import type { AnnotationMention, DocumentAnnotation, EntityType } from '@/types/types'

import { BoxIcon, CopyIcon, EditIcon, EyeIcon, LinkIcon, Loader2Icon, Trash2Icon, UserIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getAnnotationComponentDisplayText, getAnnotationComponentTitle } from '@/lib/annotation-roles'
import { cn } from '@/lib/utils'
import { DocumentPopoverAnchor } from './document-popover-anchor'
import { QualifierSummary } from './qualifier-summary'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

const ENTITY_ORDER: EntityType[] = ['subject', 'predicate', 'object']

type EntityMeta = {
  icon: LucideIcon
  chipClass: string
  buttonClass: string
  tooltip: string
  hotkey: string
  label: string
}

const ENTITY_META: Record<EntityType, EntityMeta> = {
  subject: {
    icon: UserIcon,
    chipClass: 'bg-subject-soft text-subject-fg',
    buttonClass: 'border-subject/50 text-subject-fg hover:bg-subject-soft/50 focus-visible:ring-subject',
    tooltip: 'New subject from this mention (S)',
    hotkey: 'S',
    label: 'Subject',
  },
  predicate: {
    icon: LinkIcon,
    chipClass: 'bg-predicate-soft text-predicate-fg',
    buttonClass: 'border-predicate/50 text-predicate-fg hover:bg-predicate-soft/50 focus-visible:ring-predicate',
    tooltip: 'New predicate from this mention (P)',
    hotkey: 'P',
    label: 'Predicate',
  },
  object: {
    icon: BoxIcon,
    chipClass: 'bg-object-soft text-object-fg',
    buttonClass: 'border-object/50 text-object-fg hover:bg-object-soft/50 focus-visible:ring-object',
    tooltip: 'New object from this mention (O)',
    hotkey: 'O',
    label: 'Object',
  },
}

type AnnotationListPopoverProps = {
  visible: boolean
  top: number
  left: number
  anchorWidth?: number
  anchorHeight?: number
  annotations: DocumentAnnotation[]
  onClose: () => void
  onEdit: (annotation: DocumentAnnotation) => void
  onClone: (annotation: DocumentAnnotation) => void
  onDelete: (annotationId: string) => void
  onView: (annotation: DocumentAnnotation) => void
  isDeletingAnnotation: boolean
  onCreateMention: (type: EntityType) => void
  mentionData: AnnotationMention | null
  readOnly?: boolean
}

export function AnnotationListPopover({
  visible,
  top,
  left,
  anchorWidth = 1,
  anchorHeight = 1,
  annotations,
  onClose,
  onEdit,
  onClone,
  onDelete,
  onView,
  isDeletingAnnotation,
  onCreateMention,
  mentionData,
  readOnly = false,
}: AnnotationListPopoverProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (annotationId: string) => {
    setDeletingId(annotationId)
    try {
      await onDelete(annotationId)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreateMention = useCallback((type: EntityType) => {
    if (!mentionData)
      return
    onCreateMention(type)
    onClose()
  }, [mentionData, onCreateMention, onClose])

  useEffect(() => {
    if (!visible)
      return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')
        return
      if (e.ctrlKey || e.altKey || e.metaKey)
        return

      const key = e.key.toLowerCase()
      let handled = false

      if (mentionData && !readOnly) {
        const mentionActions: Record<string, EntityType> = { s: 'subject', p: 'predicate', o: 'object' }
        if (mentionActions[key]) {
          e.preventDefault()
          handleCreateMention(mentionActions[key])
          handled = true
        }
      }

      if (annotations.length > 0 && !readOnly) {
        if (key === 'e') {
          e.preventDefault()
          onEdit(annotations[0])
        } else if (key === 'c') {
          e.preventDefault()
          onClone(annotations[0])
        }
      }

      if (key === 'escape') {
        e.preventDefault()
        onClose()
        handled = true
      }

      if (handled) {
        e.stopImmediatePropagation()
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [visible, annotations, onEdit, onClone, onClose, handleCreateMention, mentionData, readOnly])

  if (!visible || annotations.length === 0)
    return null

  return (
    <TooltipProvider delayDuration={200}>
      <div
        onFocusCapture={(e) => {
          e.stopPropagation()
        }}
      >
        <Popover open={visible} onOpenChange={open => !open && onClose()}>
          <DocumentPopoverAnchor top={top} left={left} width={anchorWidth} height={anchorHeight} />
          <PopoverContent
            className="w-96 max-w-[calc(100vw-1rem)]"
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            onWheel={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div>
                <h4 className="mb-3 truncate text-sm font-semibold">
                  {annotations.length === 1 ? 'Annotation' : `${annotations.length} Annotations`}
                  {mentionData?.value && (
                    <>
                      {' '}
                      for:
                      {' '}
                      <span className="text-xs text-muted-foreground">
                        {mentionData.value}
                      </span>
                    </>
                  )}
                </h4>
                <ScrollArea className="flex max-h-40 w-full flex-col overflow-y-auto">
                  <div className="space-y-2 pb-2">
                    {annotations.map(annotation => (
                      <Card key={annotation.id} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <div className="flex min-w-0 flex-col gap-1">
                              {ENTITY_ORDER.map((entityType) => {
                                const component = annotation[entityType]
                                if (!component)
                                  return null

                                const meta = ENTITY_META[entityType]
                                const Icon = meta.icon

                                return (
                                  <span
                                    key={entityType}
                                    className={cn('flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium', meta.chipClass)}
                                  >
                                    <Icon className="size-3 shrink-0" />
                                    <span
                                      className="min-w-0 flex-1 truncate"
                                      title={getAnnotationComponentTitle(component)}
                                    >
                                      {getAnnotationComponentDisplayText(component)}
                                    </span>
                                  </span>
                                )
                              })}
                              <QualifierSummary qualifiers={annotation.qualifiers} className="mt-1 pt-1.5" />
                            </div>
                            {readOnly
                              ? (
                                  <div className="grid shrink-0 grid-cols-1 self-start">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="size-7 p-0"
                                          aria-label="View annotation"
                                          onClick={() => {
                                            onView(annotation)
                                            onClose()
                                          }}
                                        >
                                          <EyeIcon className="size-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View details</TooltipContent>
                                    </Tooltip>
                                  </div>
                                )
                              : (
                                  <div className="grid shrink-0 grid-cols-[1.75rem_1.75rem] grid-rows-[1.75rem_1.75rem] gap-1 self-start">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="col-start-1 row-start-1 size-7 p-0"
                                          aria-label="Edit annotation"
                                          onClick={() => onEdit(annotation)}
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
                                          className="col-start-1 row-start-2 size-7 p-0"
                                          aria-label="Clone annotation"
                                          onClick={() => onClone(annotation)}
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
                                              className="col-start-2 row-start-1 size-7 p-0 text-destructive hover:text-destructive"
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
                                )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {mentionData && !readOnly && (
                <div className="space-y-3">
                  <div>
                    <h5 className="mb-2 text-xs font-medium text-muted-foreground">Create new annotation</h5>
                    <div className="flex gap-2">
                      {ENTITY_ORDER.map((entityType) => {
                        const meta = ENTITY_META[entityType]
                        const Icon = meta.icon

                        return (
                          <Tooltip key={entityType}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn('flex-1', meta.buttonClass)}
                                onClick={() => handleCreateMention(entityType)}
                              >
                                <Icon className="size-4" />
                                <span>
                                  <u>{meta.hotkey}</u>
                                  {meta.label.slice(1)}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{meta.tooltip}</TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  )
}
