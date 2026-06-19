import type { Dispatch, SetStateAction } from 'react'
import type { AnnotationComponentRole, CurrentAnnotation, CurrentAnnotationQualifier, DocumentAnnotationComponent, Entity, EntityType } from '@/types/types'
import { PopoverClose } from '@radix-ui/react-popover'
import { ArrowLeftRightIcon, ChevronDownIcon, ChevronRightIcon, CopyIcon, Loader2Icon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { EntitySelector } from '@/components/entity-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { entityTypeForComponentRole } from '@/lib/annotation-roles'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn, isMac } from '@/lib/utils'

type QualifierSide = 'predicate' | 'value'

type AnnotationFormProps = {
  currentAnnotation: CurrentAnnotation | null
  setCurrentAnnotation: Dispatch<SetStateAction<CurrentAnnotation | null>>
  onSave: () => void
  onDelete: (annotationId: string) => void
  annotationFormLoading: boolean
  isDeletingAnnotation: boolean
  corpusId: string
  removeQualifier: (qualifierId: string) => void
  assignSelectionToQualifier: (qualifierId: string, side: 'predicate' | 'value') => void
  updateQualifierEntity: (qualifierId: string, side: 'predicate' | 'value', newValue: Entity | null) => void
  hasActiveSelection: boolean
}

function isQualifierIncomplete(qualifier: CurrentAnnotationQualifier) {
  return !qualifier.predicate?.annotationValue?.trim()
    || !qualifier.value?.annotationValue?.trim()
}

export function AnnotationForm({
  currentAnnotation,
  setCurrentAnnotation,
  onSave,
  onDelete,
  annotationFormLoading,
  isDeletingAnnotation,
  corpusId,
  removeQualifier,
  assignSelectionToQualifier,
  updateQualifierEntity,
  hasActiveSelection,
}: AnnotationFormProps) {
  const subjectTag = currentAnnotation?.subject
  const predicateTag = currentAnnotation?.predicate
  const objectTag = currentAnnotation?.object

  const hasAnyTags = Boolean(subjectTag || predicateTag || objectTag)
  const hasAllTags = Boolean(subjectTag && predicateTag && objectTag)
  const qualifiers = useMemo(() => currentAnnotation?.qualifiers ?? [], [currentAnnotation?.qualifiers])
  // undefined auto-opens the first useful row; null means the user collapsed all qualifier editors.
  const [expandedQualifierId, setExpandedQualifierId] = useState<string | null | undefined>(undefined)

  const firstIncompleteQualifierId = useMemo(() => {
    return qualifiers.find(isQualifierIncomplete)?.id ?? null
  }, [qualifiers])

  // Helper function to get entity data
  const getEntityValue = (component: DocumentAnnotationComponent | undefined, role: AnnotationComponentRole): Entity | null => {
    if (!component?.entityValue)
      return null

    const entityType = entityTypeForComponentRole(role)

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
  const expandedQualifierExists = expandedQualifierId !== null
    && expandedQualifierId !== undefined
    && qualifiers.some(qualifier => qualifier.id === expandedQualifierId)
  const activeQualifierId = expandedQualifierExists
    ? expandedQualifierId
    : expandedQualifierId === null
      ? null
      : firstIncompleteQualifierId ?? qualifiers[0]?.id ?? null

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
      if (!prev)
        return prev

      const newSubject: DocumentAnnotationComponent | undefined = prev.object
        ? { ...prev.object, annotationTag: 'subject' }
        : undefined
      const newObject: DocumentAnnotationComponent | undefined = prev.subject
        ? { ...prev.subject, annotationTag: 'object' }
        : undefined

      return {
        ...prev,
        subject: newSubject,
        object: newObject,
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

  const renderQualifierSide = (
    qualifierId: string,
    side: QualifierSide,
    component: DocumentAnnotationComponent | undefined,
  ) => {
    const role: AnnotationComponentRole = side === 'predicate' ? 'qualifier-predicate' : 'qualifier-value'
    const sideLabel = side === 'predicate' ? 'Predicate' : 'Value'

    return (
      <div className="min-w-0">
        <div className="mb-1 text-xs font-medium text-muted-foreground">
          {sideLabel}
        </div>
        <div className="mb-1 flex min-w-0 items-center gap-1">
          <div
            role={component ? 'button' : undefined}
            tabIndex={component ? 0 : undefined}
            className={cn(
              'flex min-w-0 flex-1 items-center rounded-md px-2 py-0.5 text-sm font-semibold',
              component && 'cursor-pointer transition-opacity hover:opacity-80',
            )}
            style={{ backgroundColor: TYPE_TO_COLOR[role] }}
            onClick={() => scrollToElement(component)}
            onKeyDown={(e) => {
              if (component && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                scrollToElement(component)
              }
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate">
                  {component?.annotationValue ?? `${sideLabel} text`}
                </span>
              </TooltipTrigger>
              {component?.annotationValue && (
                <TooltipContent>
                  {component.annotationValue}
                </TooltipContent>
              )}
            </Tooltip>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2"
                onClick={() => assignSelectionToQualifier(qualifierId, side)}
                disabled={!hasActiveSelection || annotationFormLoading || isDeletingAnnotation}
              >
                Set
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {`Set qualifier ${side} from current selection`}
            </TooltipContent>
          </Tooltip>
        </div>
        {component
          ? (
              <EntitySelector
                type={role}
                value={getEntityValue(component, role)}
                onValueChange={newValue => updateQualifierEntity(qualifierId, side, newValue)}
                text={component.annotationValue}
                corpusId={corpusId}
              />
            )
          : (
              <div className="flex h-9 items-center rounded-md border border-dashed px-3 text-sm text-muted-foreground">
                Set text from selection
              </div>
            )}
      </div>
    )
  }

  const renderQualifierPreviewChip = (
    role: AnnotationComponentRole,
    label: string,
    component: DocumentAnnotationComponent | undefined,
  ) => {
    const entityLabel = component?.entityLabel || component?.entityValue
    const title = entityLabel && entityLabel !== component?.annotationValue
      ? `${component?.annotationValue} (${entityLabel})`
      : component?.annotationValue

    return (
      <span
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium',
          component ? 'text-slate-800' : 'border border-dashed text-muted-foreground',
        )}
        style={component ? { backgroundColor: TYPE_TO_COLOR[role] } : undefined}
        title={title}
      >
        <span className="truncate">
          {component?.annotationValue || label}
        </span>
        {entityLabel && (
          <span className="hidden max-w-24 shrink-0 truncate text-[10px] font-normal opacity-70 sm:inline">
            {entityLabel}
          </span>
        )}
      </span>
    )
  }

  const handleSave = useCallback(() => {
    if (firstIncompleteQualifierId) {
      setExpandedQualifierId(firstIncompleteQualifierId)
    }
    onSave()
  }, [firstIncompleteQualifierId, onSave])

  const handleAddQualifier = useCallback(() => {
    const qualifierId = uuidv4()
    setExpandedQualifierId(qualifierId)
    setCurrentAnnotation((prev) => {
      if (!prev) {
        return prev
      }

      const existingQualifiers = prev.qualifiers ?? []
      return {
        ...prev,
        qualifiers: [
          ...existingQualifiers,
          { id: qualifierId, position: existingQualifiers.length },
        ],
      }
    })
  }, [setCurrentAnnotation])

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
    if (currentAnnotation.qualifiers !== undefined) {
      clonedAnnotation.qualifiers = currentAnnotation.qualifiers.map((qualifier, position) => ({
        id: uuidv4(),
        position,
        predicate: cloneComponent(qualifier.predicate),
        value: cloneComponent(qualifier.value),
      }))
    }

    setCurrentAnnotation(clonedAnnotation)
    toast.success('Annotation cloned! Edit and save to create a new annotation.')
  }, [currentAnnotation, setCurrentAnnotation])

  // Keyboard shortcuts for saving (Ctrl+S / Cmd+S), cloning (C), and deleting (Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'

      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        if (hasAllTags && !annotationFormLoading && !isDeletingAnnotation) {
          handleSave()
        }
      }

      // C to clone
      if (e.key === 'c' && currentAnnotation?.id && !isInputField && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        if (!annotationFormLoading && !isDeletingAnnotation) {
          handleCloneAnnotation()
        }
      }

      // Delete to open deletion confirmation
      if (e.key === 'Delete' && currentAnnotation?.id && !isInputField && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        if (!annotationFormLoading && !isDeletingAnnotation) {
          // Trigger the popover to open
          const deleteButton = document.querySelector('[data-delete-annotation-trigger]') as HTMLButtonElement
          if (deleteButton) {
            deleteButton.click()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasAllTags, annotationFormLoading, isDeletingAnnotation, handleSave, currentAnnotation, handleCloneAnnotation])

  if (!hasAnyTags)
    return null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-1/2 z-10 w-full max-w-(--breakpoint-md) -translate-x-1/2 transition-transform duration-300 md:w-3/4 lg:w-2/3',
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
                        <Button variant="destructive" disabled={isDeletingAnnotation} data-delete-annotation-trigger>
                          {isDeletingAnnotation ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
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
                      if (currentAnnotation?.id) {
                        await onDelete(currentAnnotation.id)
                        setCurrentAnnotation(null)
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
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="bg-green-600 text-green-50 hover:bg-green-700 focus-visible:ring-green-500"
                  onClick={handleSave}
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
        <CardContent className="max-h-[min(70vh,32rem)] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div
                role="button"
                tabIndex={0}
                className="mb-1 flex w-full cursor-pointer items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: TYPE_TO_COLOR.subject }}
                onClick={() => scrollToElement(subjectTag)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    scrollToElement(subjectTag)
                  }
                }}
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
              <div
                role="button"
                tabIndex={0}
                className="mb-1 flex w-full cursor-pointer items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: TYPE_TO_COLOR.predicate }}
                onClick={() => scrollToElement(predicateTag)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    scrollToElement(predicateTag)
                  }
                }}
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
              <div
                role="button"
                tabIndex={0}
                className="mb-1 flex w-full cursor-pointer items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: TYPE_TO_COLOR.object }}
                onClick={() => scrollToElement(objectTag)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    scrollToElement(objectTag)
                  }
                }}
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
          {currentAnnotation && (
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Qualifiers</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQualifier}
                  disabled={annotationFormLoading || isDeletingAnnotation}
                >
                  <PlusIcon />
                  Add qualifier
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {qualifiers.length === 0 && (
                  <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    No qualifiers
                  </div>
                )}
                {qualifiers.map((qualifier, index) => {
                  const isExpanded = activeQualifierId === qualifier.id

                  return (
                    <div
                      key={qualifier.id}
                      className={cn(
                        'rounded-md border transition-colors',
                        isExpanded && 'border-blue-400 bg-blue-50/40',
                        !isExpanded
                        && isQualifierIncomplete(qualifier)
                        && 'border-red-200 bg-red-50/40',
                      )}
                    >
                      <div className={cn('flex gap-2 p-2', isExpanded ? 'items-start' : 'items-center')}>
                        {isExpanded
                          ? (
                              <button
                                type="button"
                                className="mt-5 flex h-7 shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground"
                                onClick={() => setExpandedQualifierId(null)}
                                aria-expanded
                              >
                                <ChevronDownIcon className="size-4 shrink-0" />
                                <span>
                                  Q
                                  {index + 1}
                                </span>
                              </button>
                            )
                          : (
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                onClick={() => setExpandedQualifierId(qualifier.id)}
                                aria-expanded={false}
                              >
                                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                  Q
                                  {index + 1}
                                </span>
                                <div className="flex min-w-0 flex-1 items-center gap-1">
                                  {renderQualifierPreviewChip('qualifier-predicate', 'Predicate text', qualifier.predicate)}
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    &rarr;
                                  </span>
                                  {renderQualifierPreviewChip('qualifier-value', 'Value text', qualifier.value)}
                                </div>
                              </button>
                            )}
                        {isExpanded && (
                          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                            {renderQualifierSide(qualifier.id, 'predicate', qualifier.predicate)}
                            {renderQualifierSide(qualifier.id, 'value', qualifier.value)}
                          </div>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'size-7 shrink-0 text-destructive hover:text-destructive',
                                isExpanded && 'mt-5',
                              )}
                              onClick={() => removeQualifier(qualifier.id)}
                              disabled={annotationFormLoading || isDeletingAnnotation}
                            >
                              <Trash2Icon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Remove qualifier
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
