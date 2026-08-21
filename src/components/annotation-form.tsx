import type { Dispatch, SetStateAction } from 'react'
import type { PropertyConstraints } from '@/lib/wikidata-constraints'
import type {
  AnnotationComponentRole,
  CurrentAnnotation,
  DocumentAnnotationComponent,
  Entity,
  EntityType,
} from '@/types/types'
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { EntitySelector } from '@/components/entity-selector'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { entityTypeForComponentRole } from '@/lib/annotation-roles'
import { validateAnnotationQualifiers } from '@/lib/annotation-validation'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn, isMac } from '@/lib/utils'
import { WIKIDATA_ITEM_PATTERN, WIKIDATA_PROPERTY_PATTERN } from '@/lib/wikidata-constraints'
import { fetchPropertyConstraints } from '@/lib/wikidata-sparql'

type QualifierSide = 'predicate' | 'value'

type AnnotationFormProps = {
  currentAnnotation: CurrentAnnotation | null
  setCurrentAnnotation: Dispatch<SetStateAction<CurrentAnnotation | null>>
  onSave: () => void
  onDelete: (annotationId: string) => void
  annotationFormLoading: boolean
  isDeletingAnnotation: boolean
  corpusId: string
  wikidataPredicateFiltering?: boolean
  wikidataConstraintWarnings?: boolean
  removeQualifier: (qualifierId: string) => void
  assignSelectionToQualifier: (
    qualifierId: string,
    side: 'predicate' | 'value',
  ) => void
  updateQualifierEntity: (
    qualifierId: string,
    side: 'predicate' | 'value',
    newValue: Entity | null,
  ) => void
  clearQualifierSide: (
    qualifierId: string,
    side: 'predicate' | 'value',
  ) => void
  hasActiveSelection: boolean
  onActiveQualifierChange: (qualifierId: string | null) => void
}

function normalizeComponentForDirtyCheck(
  component: DocumentAnnotationComponent | undefined,
) {
  if (!component) {
    return null
  }

  return {
    id: component.id,
    entityLabel: component.entityLabel ?? null,
    entityValue: component.entityValue ?? null,
    entityCustom: component.entityCustom ?? null,
    entityCustomId: component.entityCustomId ?? null,
    entityDatatype: component.entityDatatype ?? null,
    annotationStart: component.annotationStart,
    annotationEnd: component.annotationEnd,
    annotationRow: component.annotationRow,
    annotationCell: component.annotationCell,
    annotationValue: component.annotationValue,
    annotationType: component.annotationType,
    annotationTag: component.annotationTag,
    elementIndex: component.elementIndex,
  }
}

function serializeAnnotationForDirtyCheck(
  annotation: CurrentAnnotation | null,
) {
  if (!annotation) {
    return null
  }

  return JSON.stringify({
    id: annotation.id ?? null,
    subject: normalizeComponentForDirtyCheck(annotation.subject),
    predicate: normalizeComponentForDirtyCheck(annotation.predicate),
    object: normalizeComponentForDirtyCheck(annotation.object),
    qualifiers: (annotation.qualifiers ?? [])
      .map(qualifier => ({
        id: qualifier.id,
        position: qualifier.position,
        predicate: normalizeComponentForDirtyCheck(qualifier.predicate),
        value: normalizeComponentForDirtyCheck(qualifier.value),
      }))
      .sort((a, b) => a.position - b.position),
  })
}

export function AnnotationForm({
  currentAnnotation,
  setCurrentAnnotation,
  onSave,
  onDelete,
  annotationFormLoading,
  isDeletingAnnotation,
  corpusId,
  wikidataPredicateFiltering = false,
  wikidataConstraintWarnings = false,
  removeQualifier,
  assignSelectionToQualifier,
  updateQualifierEntity,
  clearQualifierSide,
  hasActiveSelection,
  onActiveQualifierChange,
}: AnnotationFormProps) {
  const subjectTag = currentAnnotation?.subject
  const predicateTag = currentAnnotation?.predicate
  const objectTag = currentAnnotation?.object

  const predicateEntityValue = currentAnnotation?.predicate?.entityValue
  const predicateEntityLabel = currentAnnotation?.predicate?.entityLabel
  const [predicateConstraints, setPredicateConstraints] = useState<PropertyConstraints | null>(null)
  const [qualifierPredicateConstraints, setQualifierPredicateConstraints] = useState<Map<string, PropertyConstraints> | null>(null)

  const constraintsActive = wikidataPredicateFiltering || wikidataConstraintWarnings

  const predicateConstraintsEligible = Boolean(
    constraintsActive
    && predicateEntityValue
    && WIKIDATA_PROPERTY_PATTERN.test(predicateEntityValue),
  )

  useEffect(() => {
    if (!predicateConstraintsEligible) {
      return
    }

    let cancelled = false
    fetchPropertyConstraints([predicateEntityValue!])
      .then(({ constraints }) => {
        if (!cancelled) {
          setPredicateConstraints(constraints.get(predicateEntityValue!) ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPredicateConstraints(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [predicateEntityValue, constraintsActive, predicateConstraintsEligible])

  const effectivePredicateConstraints = predicateConstraintsEligible ? predicateConstraints : null
  const subjectConstraintSide = effectivePredicateConstraints && effectivePredicateConstraints.domain.length > 0
    ? 'domain' as const
    : null
  const objectConstraintSide = effectivePredicateConstraints && effectivePredicateConstraints.range.length > 0
    ? 'range' as const
    : null

  const subjectEntity = currentAnnotation?.subject
  const objectEntity = currentAnnotation?.object

  const predicateEntityChecks = useMemo(() => {
    if (!constraintsActive) {
      return null
    }
    const checks: Array<{ entityId: string, side: 'domain' | 'range', label: string }> = []
    if (subjectEntity?.entityValue && WIKIDATA_ITEM_PATTERN.test(subjectEntity.entityValue)) {
      checks.push({
        entityId: subjectEntity.entityValue,
        side: 'domain',
        label: subjectEntity.entityLabel ?? subjectEntity.entityValue,
      })
    }
    if (objectEntity?.entityValue && WIKIDATA_ITEM_PATTERN.test(objectEntity.entityValue)) {
      checks.push({
        entityId: objectEntity.entityValue,
        side: 'range',
        label: objectEntity.entityLabel ?? objectEntity.entityValue,
      })
    }
    return checks.length > 0 ? checks : null
  }, [subjectEntity, objectEntity, constraintsActive])

  const hasAnyTags = Boolean(subjectTag || predicateTag || objectTag)
  const hasAllTags = Boolean(subjectTag && predicateTag && objectTag)
  const qualifiers = useMemo(
    () => currentAnnotation?.qualifiers ?? [],
    [currentAnnotation?.qualifiers],
  )
  const qualifierPredicates = useMemo(() => Array.from(new Set(
    qualifiers
      .map(qualifier => qualifier.predicate?.entityValue)
      .filter((value): value is string => value != null && WIKIDATA_PROPERTY_PATTERN.test(value)),
  )), [qualifiers])
  const qualifierPredicatesEligible = Boolean(wikidataPredicateFiltering && qualifierPredicates.length > 0)

  useEffect(() => {
    if (!qualifierPredicatesEligible) {
      return
    }

    let cancelled = false
    fetchPropertyConstraints(qualifierPredicates)
      .then(({ constraints }) => {
        if (!cancelled) {
          setQualifierPredicateConstraints(constraints)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQualifierPredicateConstraints(new Map())
        }
      })

    return () => {
      cancelled = true
    }
  }, [qualifierPredicates, wikidataPredicateFiltering, qualifierPredicatesEligible])

  const effectiveQualifierPredicateConstraints = qualifierPredicatesEligible
    ? (qualifierPredicateConstraints ?? new Map())
    : null
  // undefined auto-opens the first useful row; null means the user collapsed all qualifier editors.
  const [expandedQualifierId, setExpandedQualifierId] = useState<string | null | undefined
  >(undefined)
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const initialAnnotationIdRef = useRef<string | null>(null)
  const initialAnnotationSnapshotRef = useRef<string | null>(null)

  const firstIncompleteQualifierId = useMemo(() => {
    return (
      qualifiers.find(
        qualifier => validateAnnotationQualifiers([qualifier]).length > 0,
      )?.id ?? null
    )
  }, [qualifiers])
  const firstQualifierValidationError = useMemo(() => {
    return validateAnnotationQualifiers(qualifiers)[0] ?? null
  }, [qualifiers])

  // Helper function to get entity data
  const getEntityValue = (
    component: DocumentAnnotationComponent | undefined,
    role: AnnotationComponentRole,
  ): Entity | null => {
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
  const expandedQualifierExists
    = expandedQualifierId !== null
      && expandedQualifierId !== undefined
      && qualifiers.some(qualifier => qualifier.id === expandedQualifierId)
  const activeQualifierId = expandedQualifierExists
    ? expandedQualifierId
    : expandedQualifierId === null
      ? null
      : (firstIncompleteQualifierId ?? qualifiers[0]?.id ?? null)
  const currentAnnotationSnapshot = useMemo(
    () => serializeAnnotationForDirtyCheck(currentAnnotation),
    [currentAnnotation],
  )
  const hasUnsavedChanges = Boolean(
    currentAnnotation
    && (!currentAnnotation.id
      || (initialAnnotationSnapshotRef.current !== null
        && currentAnnotationSnapshot !== initialAnnotationSnapshotRef.current)),
  )

  useEffect(() => {
    onActiveQualifierChange(activeQualifierId)
  }, [activeQualifierId, onActiveQualifierChange])

  useEffect(() => {
    if (!currentAnnotation) {
      initialAnnotationIdRef.current = null
      initialAnnotationSnapshotRef.current = null
      return
    }

    if (!currentAnnotation.id) {
      initialAnnotationIdRef.current = null
      initialAnnotationSnapshotRef.current = null
      return
    }

    if (initialAnnotationIdRef.current !== currentAnnotation.id) {
      initialAnnotationIdRef.current = currentAnnotation.id
      initialAnnotationSnapshotRef.current = currentAnnotationSnapshot
    }
  }, [currentAnnotation, currentAnnotationSnapshot])

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

  const scrollToElement = (
    component: DocumentAnnotationComponent | undefined,
  ) => {
    if (!component)
      return

    // Try to find the specific mark element by its data attributes
    const elementContainer = document.getElementById(
      `element-${component.elementIndex}`,
    )
    if (!elementContainer) {
      return
    }

    // For table annotations, find the specific cell
    if (
      component.annotationType === 'table'
      && component.annotationRow !== null
      && component.annotationCell !== null
    ) {
      const cell = elementContainer.querySelector(
        `[data-cell="${component.annotationRow}-${component.annotationCell}"]`,
      )
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }

    // For text annotations, find the specific mark by start/end offsets
    const marks = elementContainer.querySelectorAll(
      `[data-start="${component.annotationStart}"][data-end="${component.annotationEnd}"]`,
    )
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
    const role: AnnotationComponentRole
      = side === 'predicate' ? 'qualifier-predicate' : 'qualifier-value'
    const sideLabel = side === 'predicate' ? 'Predicate' : 'Value'
    const qualifier = qualifiers.find(item => item.id === qualifierId)
    const qualifierPredicateValue = qualifier?.predicate?.entityValue
    const qualifierConstraints = qualifierPredicateValue
      ? (effectiveQualifierPredicateConstraints?.get(qualifierPredicateValue) ?? null)
      : null
    const qualifierValueConstraintSide = side === 'value' && qualifierConstraints && qualifierConstraints.range.length > 0
      ? 'range' as const
      : null
    const canAssignSelection
      = hasActiveSelection && !annotationFormLoading && !isDeletingAnnotation
    const assignSelection = () => {
      if (canAssignSelection) {
        assignSelectionToQualifier(qualifierId, side)
      }
    }

    return (
      <div className="min-w-0">
        <div
          className={cn(
            'mb-1 flex h-7 min-w-0 overflow-hidden rounded-md border text-sm font-semibold',
            component
              ? 'border-transparent'
              : 'border-dashed border-muted-foreground/40',
          )}
          style={{ backgroundColor: TYPE_TO_COLOR[role] }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex min-w-0 flex-1 items-center px-2 text-left',
                  (component || canAssignSelection)
                  && 'cursor-pointer transition-opacity hover:opacity-80',
                  !component
                  && !canAssignSelection
                  && 'cursor-not-allowed opacity-60',
                )}
                onClick={() => {
                  if (component) {
                    scrollToElement(component)
                    return
                  }
                  assignSelection()
                }}
                aria-disabled={!component && !canAssignSelection}
                aria-label={
                  component
                    ? `Scroll to qualifier ${side} text`
                    : `Use current selection as qualifier ${side}`
                }
              >
                <span className="truncate">
                  {component?.annotationValue ?? `${sideLabel} text`}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {component?.annotationValue
                ?? (canAssignSelection
                  ? `Use current selection as qualifier ${side}`
                  : 'Select text or a table cell first')}
            </TooltipContent>
          </Tooltip>
          {component && (
            <button
              type="button"
              className="flex w-7 shrink-0 items-center justify-center border-l border-slate-900/10 transition-colors hover:bg-white/30"
              onClick={() => clearQualifierSide(qualifierId, side)}
              aria-label={`Clear qualifier ${side}`}
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        {component && (
          <EntitySelector
            type={role}
            value={getEntityValue(component, role)}
            onValueChange={newValue =>
              updateQualifierEntity(qualifierId, side, newValue)}
            text={component.annotationValue}
            corpusId={corpusId}
            constraints={qualifierValueConstraintSide ? qualifierConstraints : null}
            constraintSide={qualifierValueConstraintSide}
            constraintPropertyLabel={qualifierConstraints ? (qualifier?.predicate?.entityLabel ?? qualifierPredicateValue) : undefined}
            filteringEnabled={wikidataPredicateFiltering}
          />
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
    const title
      = entityLabel && entityLabel !== component?.annotationValue
        ? `${component?.annotationValue} (${entityLabel})`
        : component?.annotationValue

    return (
      <span
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium',
          component
            ? 'text-slate-800'
            : 'border border-dashed text-muted-foreground',
        )}
        style={component ? { backgroundColor: TYPE_TO_COLOR[role] } : undefined}
        title={title}
      >
        <span className="truncate">{component?.annotationValue || label}</span>
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
      toast.error(
        firstQualifierValidationError
        ?? 'Complete or remove incomplete qualifiers before saving.',
      )
      return
    }
    onSave()
  }, [firstIncompleteQualifierId, firstQualifierValidationError, onSave])

  const discardCurrentAnnotation = useCallback(() => {
    setDiscardDialogOpen(false)
    setCurrentAnnotation(null)
  }, [setCurrentAnnotation])

  const handleDiscard = useCallback(() => {
    if (hasUnsavedChanges) {
      setDiscardDialogOpen(true)
      return
    }

    discardCurrentAnnotation()
  }, [discardCurrentAnnotation, hasUnsavedChanges])

  useEffect(() => {
    if (!discardDialogOpen) {
      return
    }

    const handleDialogEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return
      }

      e.preventDefault()
      e.stopImmediatePropagation()
      setDiscardDialogOpen(false)
    }

    window.addEventListener('keydown', handleDialogEscape, true)
    return () =>
      window.removeEventListener('keydown', handleDialogEscape, true)
  }, [discardDialogOpen])

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
    const cloneComponent = (
      comp: DocumentAnnotationComponent | undefined,
    ): DocumentAnnotationComponent | undefined => {
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
      clonedAnnotation.qualifiers = currentAnnotation.qualifiers.map(
        (qualifier, position) => ({
          id: uuidv4(),
          position,
          predicate: cloneComponent(qualifier.predicate),
          value: cloneComponent(qualifier.value),
        }),
      )
    }

    setCurrentAnnotation(clonedAnnotation)
    toast.success(
      'Annotation cloned! Edit and save to create a new annotation.',
    )
  }, [currentAnnotation, setCurrentAnnotation])

  // Keyboard shortcuts for saving (Ctrl+S / Cmd+S), cloning (C), and deleting (Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputField
        = target.tagName === 'INPUT'
          || target.tagName === 'TEXTAREA'
          || target.contentEditable === 'true'

      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        if (hasAllTags && !annotationFormLoading && !isDeletingAnnotation) {
          handleSave()
        }
      }

      // C to clone
      if (
        e.key === 'c'
        && currentAnnotation?.id
        && !isInputField
        && !e.ctrlKey
        && !e.altKey
        && !e.metaKey
      ) {
        e.preventDefault()
        e.stopPropagation()
        if (!annotationFormLoading && !isDeletingAnnotation) {
          handleCloneAnnotation()
        }
      }

      // Delete to open deletion confirmation
      if (
        e.key === 'Delete'
        && currentAnnotation?.id
        && !isInputField
        && !e.ctrlKey
        && !e.altKey
        && !e.metaKey
      ) {
        e.preventDefault()
        e.stopPropagation()
        if (!annotationFormLoading && !isDeletingAnnotation) {
          // Trigger the popover to open
          const deleteButton = document.querySelector(
            '[data-delete-annotation-trigger]',
          ) as HTMLButtonElement
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
  }, [
    hasAllTags,
    annotationFormLoading,
    isDeletingAnnotation,
    handleSave,
    currentAnnotation,
    handleCloneAnnotation,
  ])

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
              {currentAnnotation?.id
                ? 'Editing annotation'
                : 'Finalize your new annotation'}
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
                  <TooltipContent>Clone annotation (C)</TooltipContent>
                </Tooltip>
                <Popover>
                  <Tooltip>
                    <PopoverTrigger asChild>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={isDeletingAnnotation}
                          data-delete-annotation-trigger
                        >
                          {isDeletingAnnotation
                            ? (
                                <Loader2Icon className="animate-spin" />
                              )
                            : (
                                <Trash2Icon />
                              )}
                        </Button>
                      </TooltipTrigger>
                    </PopoverTrigger>
                    <TooltipContent>Delete annotation (Delete)</TooltipContent>
                  </Tooltip>
                  <PopoverContent side="top">
                    <form
                      onSubmit={async (e) => {
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
                            {isDeletingAnnotation
                              ? (
                                  <Loader2Icon className="animate-spin" />
                                )
                              : (
                                  'Delete'
                                )}
                          </Button>
                          <PopoverClose asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={isDeletingAnnotation}
                            >
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
                  disabled={
                    !hasAllTags || annotationFormLoading || isDeletingAnnotation
                  }
                >
                  {annotationFormLoading
                    ? (
                        <Loader2Icon className="animate-spin" />
                      )
                    : (
                        <SaveIcon />
                      )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Save changes (
                {saveShortcut}
                )
              </TooltipContent>
            </Tooltip>
            <AlertDialog
              open={discardDialogOpen && hasUnsavedChanges}
              onOpenChange={setDiscardDialogOpen}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleDiscard}
                    data-discard-annotation-trigger
                  >
                    ✕
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Discard changes</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive">
                    <AlertTriangleIcon />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    These annotation changes have not been saved. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">
                    Keep editing
                  </AlertDialogCancel>
                  <AlertDialogAction
                    type="button"
                    variant="destructive"
                    onClick={discardCurrentAnnotation}
                  >
                    Discard
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                onValueChange={newValue =>
                  handleEntityChange('subject', newValue)}
                text={currentAnnotation?.subject?.annotationValue ?? ''}
                corpusId={corpusId}
                constraints={subjectConstraintSide ? effectivePredicateConstraints : null}
                constraintSide={subjectConstraintSide}
                constraintPropertyLabel={predicateEntityLabel}
                filteringEnabled={wikidataPredicateFiltering}
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
                    value={getEntityValue(
                      currentAnnotation?.predicate,
                      'predicate',
                    )}
                    onValueChange={newValue =>
                      handleEntityChange('predicate', newValue)}
                    text={currentAnnotation?.predicate?.annotationValue ?? ''}
                    corpusId={corpusId}
                    constraintEntityChecks={predicateEntityChecks}
                    filteringEnabled={wikidataPredicateFiltering}
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
                  <TooltipContent>Swap subject and object</TooltipContent>
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
                    <TooltipContent>{objectTag.annotationValue}</TooltipContent>
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
                onValueChange={newValue =>
                  handleEntityChange('object', newValue)}
                text={currentAnnotation?.object?.annotationValue ?? ''}
                corpusId={corpusId}
                constraints={objectConstraintSide ? effectivePredicateConstraints : null}
                constraintSide={objectConstraintSide}
                constraintPropertyLabel={predicateEntityLabel}
                filteringEnabled={wikidataPredicateFiltering}
              />
            </div>
          </div>
          {currentAnnotation && (
            <div className="pt-3">
              <div
                className={cn(
                  'flex items-center justify-between gap-2',
                  qualifiers.length > 0 && 'mb-2',
                )}
              >
                <h3 className="text-sm font-semibold">
                  Qualifiers (
                  {qualifiers.length}
                  )
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQualifier}
                  disabled={annotationFormLoading || isDeletingAnnotation}
                  className="ml-auto"
                >
                  <PlusIcon />
                  Add qualifier
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {qualifiers.map((qualifier, index) => {
                  const isExpanded = activeQualifierId === qualifier.id
                  const qualifierHasValidationError
                    = validateAnnotationQualifiers([qualifier]).length > 0

                  return (
                    <div
                      key={qualifier.id}
                      className={cn(
                        'rounded-md border transition-colors',
                        isExpanded && 'border-blue-400 bg-blue-50/40',
                        !isExpanded
                        && qualifierHasValidationError
                        && 'border-red-200 bg-red-50/40',
                      )}
                    >
                      <div className="flex items-start gap-2 p-2">
                        {isExpanded
                          ? (
                              <button
                                type="button"
                                className="flex h-7 shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground"
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
                                className="flex h-7 min-w-0 flex-1 items-center gap-2 text-left"
                                onClick={() => setExpandedQualifierId(qualifier.id)}
                                aria-expanded={false}
                              >
                                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                  Q
                                  {index + 1}
                                </span>
                                <div className="flex min-w-0 flex-1 items-center gap-1">
                                  {renderQualifierPreviewChip(
                                    'qualifier-predicate',
                                    'Predicate text',
                                    qualifier.predicate,
                                  )}
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    &rarr;
                                  </span>
                                  {renderQualifierPreviewChip(
                                    'qualifier-value',
                                    'Value text',
                                    qualifier.value,
                                  )}
                                </div>
                              </button>
                            )}
                        {isExpanded && (
                          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                            {renderQualifierSide(
                              qualifier.id,
                              'predicate',
                              qualifier.predicate,
                            )}
                            {renderQualifierSide(
                              qualifier.id,
                              'value',
                              qualifier.value,
                            )}
                          </div>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => removeQualifier(qualifier.id)}
                              disabled={
                                annotationFormLoading || isDeletingAnnotation
                              }
                            >
                              <Trash2Icon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove qualifier</TooltipContent>
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
