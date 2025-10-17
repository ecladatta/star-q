import type { Dispatch, SetStateAction } from 'react'
import type { CurrentAnnotation, DocumentAnnotationComponent, Entity, EntityType } from '@/types/types'
import { PopoverClose } from '@radix-ui/react-popover'
import { ArrowLeftRightIcon, CopyIcon, Loader2Icon, SaveIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { EntitySelector } from '@/components/entity-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn, isMac } from '@/lib/utils'

type AnnotationFormProps = {
  currentAnnotation: CurrentAnnotation | null
  setCurrentAnnotation: Dispatch<SetStateAction<CurrentAnnotation | null>>
  onSave: () => void
  onDelete: (annotationId: string) => void
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

  const saveShortcut = isMac() ? '⌘S' : 'Ctrl+S'

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

  const handleCloneAnnotation = useCallback(() => {
    if (!currentAnnotation)
      return

    // Create a copy without the id to make it a new annotation with new component IDs
    const cloneComponent = (comp: DocumentAnnotationComponent | undefined): DocumentAnnotationComponent | undefined => {
      if (!comp) {
        return undefined
      }
      return {
        ...comp,
        id: uuidv4(),
      }
    }

    const clonedAnnotation: CurrentAnnotation = {
      subject: cloneComponent(currentAnnotation.subject),
      predicate: cloneComponent(currentAnnotation.predicate),
      object: cloneComponent(currentAnnotation.object),
    }

    setCurrentAnnotation(clonedAnnotation)
    toast.success('Annotation cloned! Edit and save to create a new annotation.')
  }, [currentAnnotation, setCurrentAnnotation])

  const scrollToElement = (component: DocumentAnnotationComponent | undefined) => {
    if (!component)
      return

    // Try to find the specific mark element by its data attributes
    const elementContainer = document.getElementById(`element-${component.elementIndex}`)
    if (!elementContainer) {
      return
    }

    // For table annotations, find the specific cell
    if (component.annotationType === 'table' && component.annotationRow !== null && component.annotationCell !== null) {
      const cell = elementContainer.querySelector(`[data-cell="${component.annotationRow}-${component.annotationCell}"]`)
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }

    // For text annotations, find the specific mark by start/end offsets
    const marks = elementContainer.querySelectorAll(`[data-start="${component.annotationStart}"][data-end="${component.annotationEnd}"]`)
    if (marks.length > 0) {
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // Fallback to scrolling to the element container
    elementContainer.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Keyboard shortcuts for saving (Ctrl+S / Cmd+S) and cloning (C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'

      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        if (hasAllTags && !annotationFormLoading && !isDeletingAnnotation) {
          onSave()
        }
      }

      // C to clone (only if we're editing an existing annotation and not in an input field)
      if (e.key === 'c' && currentAnnotation?.id && !isInputField && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        if (!annotationFormLoading && !isDeletingAnnotation) {
          handleCloneAnnotation()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasAllTags, annotationFormLoading, isDeletingAnnotation, onSave, currentAnnotation, handleCloneAnnotation])

  if (!hasAnyTags)
    return null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-1/2 z-10 w-full max-w-screen-md -translate-x-1/2 transition-transform duration-300 md:w-3/4 lg:w-2/3',
        hasAnyTags ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <Card
        className={cn(
          'mb-6 w-full rounded-lg border text-left transition-all',
          currentAnnotation?.id
          && 'border-blue-500 shadow-md ring-2 ring-blue-500/20',
        )}
      >
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
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleCloneAnnotation}
                      disabled={annotationFormLoading || isDeletingAnnotation}
                    >
                      <CopyIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Clone annotation (C)
                  </TooltipContent>
                </Tooltip>
                <Popover>
                  <Tooltip>
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
                  <PopoverContent side="top">
                    <div className="flex flex-col items-center">
                      <p>Are you sure you want to delete this annotation?</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            if (currentAnnotation?.id) {
                              await onDelete(currentAnnotation.id)
                              setCurrentAnnotation(null)
                            }
                          }}
                          disabled={isDeletingAnnotation}
                        >
                          {isDeletingAnnotation ? <Loader2Icon className="animate-spin" /> : 'Delete'}
                        </Button>
                        <PopoverClose asChild>
                          <Button variant="ghost" disabled={isDeletingAnnotation}>
                            Cancel
                          </Button>
                        </PopoverClose>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            <Tooltip>
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
                Save changes (
                {saveShortcut}
                )
              </TooltipContent>
            </Tooltip>
            <Tooltip>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <button
                type="button"
                className="mb-1 flex w-full items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: TYPE_TO_COLOR.subject }}
                onClick={() => scrollToElement(subjectTag)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate">
                      {subjectTag?.annotationValue ?? '\u00A0'}
                    </span>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTag('subject')
                    }}
                  >
                    ✕
                  </button>
                )}
              </button>
              <EntitySelector
                type="subject"
                value={getEntityValue(currentAnnotation?.subject, 'subject')}
                onValueChange={newValue => handleEntityChange('subject', newValue)}
                text={currentAnnotation?.subject?.annotationValue ?? ''}
                corpusId={corpusId}
              />
            </div>
            <div>
              <button
                type="button"
                className="mb-1 flex w-full items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: TYPE_TO_COLOR.predicate }}
                onClick={() => scrollToElement(predicateTag)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate">
                      {predicateTag?.annotationValue ?? '\u00A0'}
                    </span>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTag('predicate')
                    }}
                  >
                    ✕
                  </button>
                )}
              </button>
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
                <Tooltip>
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
              <button
                type="button"
                className="mb-1 flex w-full items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: TYPE_TO_COLOR.object }}
                onClick={() => scrollToElement(objectTag)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate">
                      {objectTag?.annotationValue ?? '\u00A0'}
                    </span>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTag('object')
                    }}
                  >
                    ✕
                  </button>
                )}
              </button>
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
