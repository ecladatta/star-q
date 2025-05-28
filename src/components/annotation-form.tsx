import type { CurrentAnnotation, DocumentAnnotationComponent, Entity, EntityType } from '@/types/types'
import type { Dispatch, SetStateAction } from 'react'
import { EntitySelector } from '@/components/entity-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { ArrowLeftRightIcon, Loader2Icon, SaveIcon, Trash2Icon } from 'lucide-react'

type AnnotationFormProps = {
  currentAnnotation: CurrentAnnotation | null
  setCurrentAnnotation: Dispatch<SetStateAction<CurrentAnnotation | null>>
  onSave: () => void
  onDelete: () => void
  annotationFormLoading: boolean
  isDeletingAnnotation: boolean
  corpusId: string
}

export function AnnotationForm({
  currentAnnotation,
  setCurrentAnnotation,
  onSave,
  onDelete,
  annotationFormLoading,
  isDeletingAnnotation,
  corpusId,
}: AnnotationFormProps) {
  const subjectTag = currentAnnotation?.subject
  const predicateTag = currentAnnotation?.predicate
  const objectTag = currentAnnotation?.object

  const hasAnyTags = Boolean(subjectTag || predicateTag || objectTag)
  const hasAllTags = Boolean(subjectTag && predicateTag && objectTag)

  // Helper function to get entity data
  const getEntityValue = (component: DocumentAnnotationComponent | undefined, entityType: EntityType): Entity | null => {
    if (!component?.entityValue)
      return null

    return {
      label: component.entityLabel || '',
      value: component.entityValue,
      custom: component.entityCustom || false,
      customId: component.entityCustomId || null,
      datatype: component.entityDatatype || null,
      type: entityType,
    }
  }

  const handleEntityChange = (type: EntityType, newValue: Entity | null) => {
    setCurrentAnnotation((prev) => {
      if (!prev?.[type])
        return prev
      return {
        ...prev,
        [type]: {
          ...prev[type]!,
          entityLabel: newValue?.label || null,
          entityValue: newValue?.value || null,
          entityCustom: newValue?.custom || false,
          entityCustomId: newValue?.customId || null,
          entityDatatype: newValue?.datatype || null,
        },
      }
    })
  }

  const handleSwapSubjectObject = () => {
    setCurrentAnnotation((prev) => {
      if (!prev?.subject || !prev?.object)
        return prev
      return {
        ...prev,
        subject: prev.object,
        object: prev.subject,
      }
    })
  }

  const removeTag = (type: EntityType) => {
    setCurrentAnnotation((prev: CurrentAnnotation | null) => {
      if (!prev)
        return prev
      return { ...prev, [type]: undefined }
    })
  }

  if (!hasAnyTags)
    return null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-1/2 z-10 w-full max-w-screen-md -translate-x-1/2 transition-transform duration-300 md:w-3/4 lg:w-2/3',
        hasAnyTags ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <Card className="mb-6 rounded-none sm:rounded-xl">
        <CardHeader className="flex flex-row pb-4">
          <div>
            <CardTitle>
              {currentAnnotation?.id ? 'Editing annotation' : 'Finalize your new annotation'}
            </CardTitle>
            <CardDescription>
              Select entities for each subject, predicate, and object.
            </CardDescription>
          </div>
          <div className="ml-auto flex gap-2">
            {currentAnnotation?.id && (
              <Popover>
                <Tooltip delayDuration={200}>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <Button variant="destructive" disabled={isDeletingAnnotation}>
                        {isDeletingAnnotation ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
                      </Button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <TooltipContent>
                    Delete annotation
                  </TooltipContent>
                </Tooltip>
                <PopoverContent>
                  <div className="flex flex-col items-center">
                    <p>Are you sure you want to delete this annotation?</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="destructive" onClick={onDelete} disabled={isDeletingAnnotation}>
                        {isDeletingAnnotation ? <Loader2Icon className="animate-spin" /> : 'Delete'}
                      </Button>
                      <Button variant="ghost" disabled={isDeletingAnnotation}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  className="bg-green-600 text-green-50 hover:bg-green-700 focus-visible:ring-green-500"
                  onClick={onSave}
                  disabled={!hasAllTags || annotationFormLoading || isDeletingAnnotation}
                >
                  {annotationFormLoading ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Save changes
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentAnnotation(null)}
                >
                  ✕
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Discard changes
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold" style={{ backgroundColor: TYPE_TO_COLOR.subject }}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger className="truncate">
                    {subjectTag?.annotationValue ?? '\u00A0'}
                  </TooltipTrigger>
                  {subjectTag?.annotationValue && (
                    <TooltipContent>
                      {subjectTag.annotationValue}
                    </TooltipContent>
                  )}
                </Tooltip>
                {subjectTag && (
                  <button
                    type="button"
                    className="ml-2 shrink-0"
                    onClick={() => removeTag('subject')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <EntitySelector
                type="subject"
                value={getEntityValue(currentAnnotation?.subject, 'subject')}
                onValueChange={newValue => handleEntityChange('subject', newValue)}
                text={currentAnnotation?.subject?.annotationValue ?? ''}
                corpusId={corpusId}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold" style={{ backgroundColor: TYPE_TO_COLOR.predicate }}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger className="truncate">
                    {predicateTag?.annotationValue ?? '\u00A0'}
                  </TooltipTrigger>
                  {predicateTag?.annotationValue && (
                    <TooltipContent>
                      {predicateTag.annotationValue}
                    </TooltipContent>
                  )}
                </Tooltip>
                {predicateTag && (
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => removeTag('predicate')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex min-w-0 items-center gap-1">
                <div className="min-w-0 flex-1">
                  <EntitySelector
                    type="predicate"
                    value={getEntityValue(currentAnnotation?.predicate, 'predicate')}
                    onValueChange={newValue => handleEntityChange('predicate', newValue)}
                    text={currentAnnotation?.predicate?.annotationValue ?? ''}
                    corpusId={corpusId}
                  />
                </div>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="px-2"
                      onClick={handleSwapSubjectObject}
                    >
                      <ArrowLeftRightIcon className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Swap subject and object
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold" style={{ backgroundColor: TYPE_TO_COLOR.object }}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger className="truncate">
                    {objectTag?.annotationValue ?? '\u00A0'}
                  </TooltipTrigger>
                  {objectTag?.annotationValue && (
                    <TooltipContent>
                      {objectTag.annotationValue}
                    </TooltipContent>
                  )}
                </Tooltip>
                {objectTag && (
                  <button
                    type="button"
                    className="ml-2"
                    onClick={() => removeTag('object')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <EntitySelector
                type="object"
                value={getEntityValue(currentAnnotation?.object, 'object')}
                onValueChange={newValue => handleEntityChange('object', newValue)}
                text={currentAnnotation?.object?.annotationValue ?? ''}
                corpusId={corpusId}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
