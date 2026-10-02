import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { QuantityState } from '@/components/entity-selector'
import type { BatchMention, BatchMentionQuantity, BatchMentionRow } from '@/lib/batch-mentions'
import type { ConstraintEntityCheck, ConstraintSide, PropertyConstraints } from '@/lib/wikibase-constraints'
import type {
  AnnotationComponentRole,
  CurrentAnnotation,
  DocumentAnnotationComponent,
  Entity,
  EntityType,
  UnitRef,
} from '@/types/types'
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  EllipsisIcon,
  LayersIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { fetchWikibasePropertyConstraints } from '@/actions/wikibase/wikibaseActions'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { entityTypeForComponentRole, hasEntityLink } from '@/lib/annotation-roles'
import { validateAnnotationQualifiers } from '@/lib/annotation-validation'
import { mentionKey } from '@/lib/batch-mentions'
import { isNumericEntityDatatype } from '@/lib/datatypes'
import { isValidQuantityAmount } from '@/lib/numeric-units'
import { cn, isMac } from '@/lib/utils'
import { WIKIBASE_ITEM_PATTERN, WIKIBASE_PROPERTY_PATTERN } from '@/lib/wikibase-constraints'

type QualifierSide = 'predicate' | 'value'

const ROLE_SOFT: Record<AnnotationComponentRole, string> = {
  'subject': 'bg-subject-soft text-subject-fg',
  'predicate': 'bg-predicate-soft text-predicate-fg',
  'object': 'bg-object-soft text-object-fg',
  'qualifier-predicate': 'bg-qualifier-soft text-qualifier-fg',
  'qualifier-value': 'bg-qualifier-soft text-qualifier-fg',
}

type AnnotationFormProps = {
  currentAnnotation: CurrentAnnotation | null
  setCurrentAnnotation: Dispatch<SetStateAction<CurrentAnnotation | null>>
  onSave: () => void
  onDelete: (annotationId: string) => void
  annotationFormLoading: boolean
  isDeletingAnnotation: boolean
  corpusId: string
  wikibasePredicateFiltering?: boolean
  wikibaseConstraintWarnings?: boolean
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
  batchMode?: boolean
  batchReady?: boolean
  batchSummary?: string | null
  batchCreating?: boolean
  batchRole?: EntityType
  batchMentionsCount?: number
  batchMentionRows?: BatchMentionRow[] | null
  batchMentionEntities?: Map<string, Entity>
  batchMentionQuantities?: Map<string, BatchMentionQuantity>
  batchQuantity?: BatchMentionQuantity | null
  onBatchQuantityApply?: (quantity: BatchMentionQuantity) => void
  onBatchQuantityClear?: () => void
  onBatchMentionQuantityChange?: (unit: BatchMention, quantity: { value: string, lowerBound: string, upperBound: string } | null) => void
  onBatchMentionQuantityUnitChange?: (unit: BatchMention, unitRef: UnitRef | null) => void
  onBatchRoleChange?: (role: EntityType) => void
  onBatchMentionEntityChange?: (unit: BatchMention, entity: Entity | null) => void
  scrollToMentions?: () => void
  onBatchExit?: () => void
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
    unit: component.unit ?? null,
    quantityLowerBound: component.quantityLowerBound ?? null,
    quantityUpperBound: component.quantityUpperBound ?? null,
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

const ROLE_LABEL: Record<EntityType, string> = {
  subject: 'Subject',
  predicate: 'Predicate',
  object: 'Object',
}

function batchMentionsLabel(rows: BatchMentionRow[]): string {
  const cellCount = rows.filter(row => row.mention.kind === 'cell').length
  const spanCount = rows.length - cellCount
  if (cellCount > 0 && spanCount > 0) {
    return `${cellCount} cell${cellCount === 1 ? '' : 's'} · ${spanCount} text${spanCount === 1 ? '' : 's'}`
  }
  if (spanCount > 0) {
    return `${spanCount} text${spanCount === 1 ? '' : 's'}`
  }
  return `${cellCount} cell${cellCount === 1 ? '' : 's'}`
}

function batchMentionKinds(rows: BatchMentionRow[]): string {
  const hasCells = rows.some(row => row.mention.kind === 'cell')
  const hasSpans = rows.some(row => row.mention.kind === 'span')
  if (hasCells && hasSpans) {
    return 'cell or text'
  }
  return hasSpans ? 'text' : 'cell'
}

function BatchMentionsIndicator({
  slotRole,
  rows,
  onRoleChange,
  onScrollToMentions,
  disabled = false,
}: {
  slotRole: EntityType
  rows: BatchMentionRow[]
  onRoleChange?: (role: EntityType) => void
  onScrollToMentions?: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-1 rounded-md border border-dashed pl-1.5',
        ROLE_SOFT[slotRole],
      )}
    >
      <button
        type="button"
        className="flex cursor-pointer items-center gap-1.5 truncate text-sm"
        onClick={onScrollToMentions}
        aria-label={`Scroll to the batch selections, which fill the ${ROLE_LABEL[slotRole].toLowerCase()} slot`}
      >
        <LayersIcon className="size-3.5" />
        {batchMentionsLabel(rows)}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            className="ml-auto cursor-pointer rounded-sm p-1 hover:bg-foreground/10"
            aria-label="Change slot"
          >
            <EllipsisIcon className="block size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {(['subject', 'predicate', 'object'] as EntityType[]).map(type => (
            <DropdownMenuItem
              key={type}
              className="justify-between"
              onClick={() => onRoleChange?.(type)}
            >
              Fill
              {' '}
              {ROLE_LABEL[type].toLowerCase()}
              {' '}
              slot
              {slotRole === type && <CheckIcon className="size-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SlotField({
  slotRole,
  tag,
  entityValue,
  onEntityChange,
  unit,
  onUnitChange,
  quantity,
  onQuantityChange,
  scrollTo,
  onRemove,
  corpusId,
  constraints,
  constraintSide,
  constraintPropertyLabel,
  constraintEntityChecks,
  filteringEnabled,
  trailing,
}: {
  slotRole: EntityType
  tag: DocumentAnnotationComponent | undefined
  entityValue: Entity | null
  onEntityChange: (newValue: Entity | null) => void
  unit?: UnitRef | null
  onUnitChange?: (unit: UnitRef | null) => void
  quantity?: QuantityState | null
  onQuantityChange?: (quantity: QuantityState) => void
  scrollTo: () => void
  onRemove: () => void
  corpusId: string
  constraints?: PropertyConstraints | null
  constraintSide?: ConstraintSide | null
  constraintPropertyLabel?: string | null
  constraintEntityChecks?: Array<ConstraintEntityCheck & { label: string }> | null
  filteringEnabled?: boolean
  trailing?: ReactNode
}) {
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'mb-1 flex w-full cursor-pointer items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-medium transition-opacity hover:opacity-80',
          ROLE_SOFT[slotRole],
        )}
        onClick={() => scrollTo()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            scrollTo()
          }
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate">
              {tag?.annotationValue ?? '\u00A0'}
            </span>
          </TooltipTrigger>
          {tag?.annotationValue && (
            <TooltipContent>
              {tag.annotationValue}
            </TooltipContent>
          )}
        </Tooltip>
        {tag && (
          <button
            type="button"
            className="ml-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            aria-label={`Remove ${tag.annotationValue}`}
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <div className="min-w-0 flex-1">
          <EntitySelector
            type={slotRole}
            value={entityValue}
            onValueChange={onEntityChange}
            text={tag?.annotationValue ?? ''}
            corpusId={corpusId}
            constraints={constraints}
            constraintSide={constraintSide}
            constraintPropertyLabel={constraintPropertyLabel}
            constraintEntityChecks={constraintEntityChecks}
            filteringEnabled={filteringEnabled}
            unit={unit}
            onUnitChange={onUnitChange}
            quantity={quantity}
            onQuantityChange={onQuantityChange}
          />
        </div>
        {trailing}
      </div>
    </>
  )
}

export function AnnotationForm({
  currentAnnotation,
  setCurrentAnnotation,
  onSave,
  onDelete,
  annotationFormLoading,
  isDeletingAnnotation,
  corpusId,
  wikibasePredicateFiltering = false,
  wikibaseConstraintWarnings = false,
  removeQualifier,
  assignSelectionToQualifier,
  updateQualifierEntity,
  clearQualifierSide,
  hasActiveSelection,
  onActiveQualifierChange,
  batchMode = false,
  batchReady = false,
  batchSummary = null,
  batchCreating = false,
  batchRole,
  batchMentionsCount,
  batchMentionRows = null,
  batchMentionEntities,
  batchMentionQuantities,
  batchQuantity,
  onBatchQuantityApply,
  onBatchQuantityClear,
  onBatchMentionQuantityChange,
  onBatchMentionQuantityUnitChange,
  onBatchRoleChange,
  onBatchMentionEntityChange,
  scrollToMentions,
  onBatchExit,
}: AnnotationFormProps) {
  const subjectTag = currentAnnotation?.subject
  const predicateTag = currentAnnotation?.predicate
  const objectTag = currentAnnotation?.object

  const predicateEntityValue = currentAnnotation?.predicate?.entityValue
  const predicateEntityLabel = currentAnnotation?.predicate?.entityLabel
  const [predicateConstraints, setPredicateConstraints] = useState<PropertyConstraints | null>(null)
  const [qualifierPredicateConstraints, setQualifierPredicateConstraints] = useState<Record<string, PropertyConstraints> | null>(null)

  const constraintsActive = wikibasePredicateFiltering || wikibaseConstraintWarnings

  const predicateConstraintsEligible = Boolean(
    constraintsActive
    && predicateEntityValue
    && WIKIBASE_PROPERTY_PATTERN.test(predicateEntityValue),
  )

  useEffect(() => {
    if (!predicateConstraintsEligible) {
      return
    }

    let cancelled = false
    fetchWikibasePropertyConstraints(corpusId, [predicateEntityValue!])
      .then(({ constraints }) => {
        if (!cancelled) {
          setPredicateConstraints(constraints[predicateEntityValue!] ?? null)
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
  }, [corpusId, predicateEntityValue, constraintsActive, predicateConstraintsEligible])

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
    if (subjectEntity?.entityValue && WIKIBASE_ITEM_PATTERN.test(subjectEntity.entityValue)) {
      checks.push({
        entityId: subjectEntity.entityValue,
        side: 'domain',
        label: subjectEntity.entityLabel ?? subjectEntity.entityValue,
      })
    }
    if (objectEntity?.entityValue && WIKIBASE_ITEM_PATTERN.test(objectEntity.entityValue)) {
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
  const docked = hasAnyTags || batchMode
  const qualifiers = useMemo(
    () => currentAnnotation?.qualifiers ?? [],
    [currentAnnotation?.qualifiers],
  )
  const qualifierPredicates = useMemo(() => Array.from(new Set(
    qualifiers
      .map(qualifier => qualifier.predicate?.entityValue)
      .filter((value): value is string => value != null && WIKIBASE_PROPERTY_PATTERN.test(value)),
  )), [qualifiers])
  const qualifierPredicatesEligible = Boolean(wikibasePredicateFiltering && qualifierPredicates.length > 0)

  useEffect(() => {
    if (!qualifierPredicatesEligible) {
      return
    }

    let cancelled = false
    fetchWikibasePropertyConstraints(corpusId, qualifierPredicates)
      .then(({ constraints }) => {
        if (!cancelled) {
          setQualifierPredicateConstraints(constraints)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQualifierPredicateConstraints({})
        }
      })

    return () => {
      cancelled = true
    }
  }, [corpusId, qualifierPredicates, wikibasePredicateFiltering, qualifierPredicatesEligible])

  const effectiveQualifierPredicateConstraints = qualifierPredicatesEligible
    ? (qualifierPredicateConstraints ?? {})
    : null
  const batchConstraintSide = batchRole === 'subject'
    ? subjectConstraintSide
    : batchRole === 'object'
      ? objectConstraintSide
      : null
  const batchMentionKindsLabel = batchMentionKinds(batchMentionRows ?? [])
  const singleBatchMention = batchMentionsCount === 1 ? batchMentionRows?.[0] ?? null : null
  const singleBatchMentionEntity = singleBatchMention
    ? batchMentionEntities?.get(mentionKey(singleBatchMention.mention)) ?? null
    : null
  const singleBatchMentionQuantity = singleBatchMention
    ? batchMentionQuantities?.get(mentionKey(singleBatchMention.mention)) ?? null
    : null
  const batchQuantityFields = batchQuantity
    ? { value: batchQuantity.value, lowerBound: batchQuantity.lowerBound, upperBound: batchQuantity.upperBound }
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
    if (!component || component.entityValue === null || !hasEntityLink(component)) {
      return null
    }

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

  // Tracks which components the editor bumped to decimal, so clearing the
  // quantity can revert the datatype.
  const quantityDatatypeBumpRef = useRef<Set<string>>(new Set())

  const handleEntityChange = (type: EntityType, newValue: Entity | null) => {
    setCurrentAnnotation((prev) => {
      if (!prev?.[type])
        return prev
      const updated = {
        ...prev[type]!,
        entityLabel: newValue?.label || null,
        entityValue: newValue?.value || null,
        entityCustom: newValue?.custom || false,
        entityCustomId: newValue?.customId || null,
        entityDatatype: newValue?.datatype || null,
      }
      if (type === 'object' && (updated.unit || updated.quantityLowerBound || updated.quantityUpperBound)) {
        // An object holds either an entity link or a quantity, never both.
        const identityChanged = newValue === null
          || newValue.value !== prev[type]!.entityValue
          || newValue.customId !== prev[type]!.entityCustomId
          || newValue.custom !== prev[type]!.entityCustom
        if (identityChanged) {
          quantityDatatypeBumpRef.current.delete(updated.id)
          return {
            ...prev,
            [type]: {
              ...updated,
              unit: null,
              quantityLowerBound: null,
              quantityUpperBound: null,
            },
          }
        }
      }
      return {
        ...prev,
        [type]: updated,
      }
    })
  }

  const handleUnitChange = (type: EntityType, unit: UnitRef | null) => {
    setCurrentAnnotation((prev) => {
      const component = prev?.[type]
      if (!component) {
        return prev
      }

      const hadLink = type === 'object'
        && (component.entityCustom || (component.entityValue !== null && WIKIBASE_ITEM_PATTERN.test(component.entityValue)))
      return {
        ...prev,
        [type]: {
          ...component,
          unit: unit ?? null,
          ...(hadLink && unit !== null
            ? {
                entityLabel: null,
                entityValue: null,
                entityCustom: false,
                entityCustomId: null,
                entityDatatype: null,
              }
            : {}),
        },
      }
    })
  }

  const handleQuantityChange = (type: EntityType, quantity: QuantityState) => {
    setCurrentAnnotation((prev) => {
      const component = prev?.[type]
      if (!component) {
        return prev
      }

      const updated = {
        ...component,
        entityValue: quantity.value || null,
        quantityLowerBound: quantity.lowerBound || null,
        quantityUpperBound: quantity.upperBound || null,
      }
      if (type === 'object' && (component.entityCustom || WIKIBASE_ITEM_PATTERN.test(component.entityValue ?? ''))) {
        updated.entityLabel = null
        updated.entityCustom = false
        updated.entityCustomId = null
      }
      const bumped = quantityDatatypeBumpRef.current.has(component.id)
      if (quantity.value && isValidQuantityAmount(quantity.value)) {
        if (!isNumericEntityDatatype(updated.entityDatatype)) {
          quantityDatatypeBumpRef.current.add(component.id)
          updated.entityDatatype = 'decimal'
        }
      } else if (!quantity.value && !component.unit && bumped) {
        quantityDatatypeBumpRef.current.delete(component.id)
        updated.entityDatatype = null
      }
      return {
        ...prev,
        [type]: updated,
      }
    })
  }

  const handleSwapSubjectObject = () => {
    if (batchMode && (batchRole === 'subject' || batchRole === 'object')) {
      const otherRole: EntityType = batchRole === 'subject' ? 'object' : 'subject'
      setCurrentAnnotation((prev) => {
        if (!prev)
          return prev

        const swapped = prev[otherRole]
        return {
          ...prev,
          [batchRole]: swapped ? { ...swapped, annotationTag: batchRole } : undefined,
          [otherRole]: undefined,
        }
      })
      onBatchRoleChange?.(otherRole)
      return
    }

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
      ? (effectiveQualifierPredicateConstraints?.[qualifierPredicateValue] ?? null)
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
            'mb-1 flex h-7 min-w-0 overflow-hidden rounded-md border text-sm font-medium',
            component
              ? cn('border-transparent', ROLE_SOFT[role])
              : 'border-dashed border-muted-foreground/40 text-muted-foreground',
          )}
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
              className="flex w-7 shrink-0 items-center justify-center border-l border-border transition-colors hover:bg-foreground/10"
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
            filteringEnabled={wikibasePredicateFiltering}
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
            ? ROLE_SOFT[role]
            : 'border border-dashed text-muted-foreground',
        )}
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
    if (batchMode && onBatchExit) {
      onBatchExit()
      return
    }
    setCurrentAnnotation(null)
  }, [batchMode, onBatchExit, setCurrentAnnotation])

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
        if ((hasAllTags || (batchMode && batchReady)) && !annotationFormLoading && !isDeletingAnnotation && !batchCreating) {
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
    batchMode,
    batchReady,
    batchCreating,
  ])

  return (
    <div
      inert={!docked}
      className={cn(
        'fixed bottom-0 left-1/2 z-40 w-full max-w-(--breakpoint-md) -translate-x-1/2 transition-transform duration-300 md:w-3/4 lg:w-2/3',
        docked ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <Card
        className={cn(
          'mb-0 w-full rounded-lg border text-left transition-all md:mb-6',
          (currentAnnotation?.id || batchMode)
          && 'border-accent ring-1 ring-accent/20',
        )}
      >
        <CardHeader className="flex flex-row pb-4">
          <div>
            <CardTitle>
              {batchMode
                ? 'Batch annotation'
                : currentAnnotation?.id
                  ? 'Editing annotation'
                  : 'Finalize your new annotation'}
            </CardTitle>
            <CardDescription>
              {batchMode
                ? `One annotation per selected ${batchMentionKindsLabel}.`
                : 'Select entities for each subject, predicate, and object.'}
            </CardDescription>
          </div>
          <div className="ml-auto flex gap-2">
            {!batchMode && currentAnnotation?.id && (
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
                  className="bg-success text-success-foreground hover:bg-success/90"
                  onClick={handleSave}
                  disabled={
                    batchMode
                      ? !batchReady || batchCreating || annotationFormLoading || isDeletingAnnotation
                      : !hasAllTags || annotationFormLoading || isDeletingAnnotation
                  }
                >
                  {(batchMode ? batchCreating : annotationFormLoading)
                    ? (
                        <Loader2Icon className="animate-spin" />
                      )
                    : (
                        <SaveIcon />
                      )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {batchMode
                  ? `${batchSummary ?? 'Create annotations'} (${saveShortcut})`
                  : 'Save changes ('}
                {!batchMode && saveShortcut}
                {!batchMode && ')'}
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
                <TooltipContent>{batchMode ? 'Exit batch mode' : 'Discard changes'}</TooltipContent>
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
              {batchMode && batchRole === 'subject'
                ? (
                    <>
                      <BatchMentionsIndicator slotRole="subject" rows={batchMentionRows ?? []} onRoleChange={onBatchRoleChange} onScrollToMentions={scrollToMentions} disabled={batchCreating} />
                      {singleBatchMention && (
                        <div className="mt-1">
                          <EntitySelector
                            type="subject"
                            value={singleBatchMentionEntity}
                            onValueChange={newValue => onBatchMentionEntityChange?.(singleBatchMention.mention, newValue)}
                            text={singleBatchMention.text}
                            corpusId={corpusId}
                            constraints={subjectConstraintSide ? effectivePredicateConstraints : null}
                            constraintSide={subjectConstraintSide}
                            constraintPropertyLabel={predicateEntityLabel}
                            filteringEnabled={wikibasePredicateFiltering}
                          />
                        </div>
                      )}
                    </>
                  )
                : (
                    <SlotField
                      slotRole="subject"
                      tag={subjectTag}
                      entityValue={getEntityValue(currentAnnotation?.subject, 'subject')}
                      onEntityChange={newValue => handleEntityChange('subject', newValue)}
                      scrollTo={() => scrollToElement(subjectTag)}
                      onRemove={() => removeTag('subject')}
                      corpusId={corpusId}
                      constraints={subjectConstraintSide ? effectivePredicateConstraints : null}
                      constraintSide={subjectConstraintSide}
                      constraintPropertyLabel={predicateEntityLabel}
                      filteringEnabled={wikibasePredicateFiltering}
                    />
                  )}
            </div>
            <div>
              {batchMode && batchRole === 'predicate'
                ? (
                    <>
                      <BatchMentionsIndicator slotRole="predicate" rows={batchMentionRows ?? []} onRoleChange={onBatchRoleChange} onScrollToMentions={scrollToMentions} disabled={batchCreating} />
                      {singleBatchMention && (
                        <div className="mt-1">
                          <EntitySelector
                            type="predicate"
                            value={singleBatchMentionEntity}
                            onValueChange={newValue => onBatchMentionEntityChange?.(singleBatchMention.mention, newValue)}
                            text={singleBatchMention.text}
                            corpusId={corpusId}
                            constraintEntityChecks={predicateEntityChecks}
                            filteringEnabled={wikibasePredicateFiltering}
                          />
                        </div>
                      )}
                    </>
                  )
                : (
                    <SlotField
                      slotRole="predicate"
                      tag={predicateTag}
                      entityValue={getEntityValue(currentAnnotation?.predicate, 'predicate')}
                      onEntityChange={newValue => handleEntityChange('predicate', newValue)}
                      scrollTo={() => scrollToElement(predicateTag)}
                      onRemove={() => removeTag('predicate')}
                      corpusId={corpusId}
                      constraintEntityChecks={predicateEntityChecks}
                      filteringEnabled={wikibasePredicateFiltering}
                      trailing={(
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              className="px-2"
                              disabled={batchCreating}
                              onClick={handleSwapSubjectObject}
                            >
                              <ArrowLeftRightIcon className="size-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Swap subject and object</TooltipContent>
                        </Tooltip>
                      )}
                    />
                  )}
            </div>
            <div>
              {batchMode && batchRole === 'object'
                ? (
                    <>
                      <BatchMentionsIndicator slotRole="object" rows={batchMentionRows ?? []} onRoleChange={onBatchRoleChange} onScrollToMentions={scrollToMentions} disabled={batchCreating} />
                      {singleBatchMention && (
                        <div className="mt-1">
                          <EntitySelector
                            type="object"
                            value={singleBatchMentionEntity}
                            onValueChange={newValue => onBatchMentionEntityChange?.(singleBatchMention.mention, newValue)}
                            quantity={{
                              value: singleBatchMentionQuantity?.value ?? '',
                              lowerBound: singleBatchMentionQuantity?.lowerBound ?? '',
                              upperBound: singleBatchMentionQuantity?.upperBound ?? '',
                            }}
                            unit={singleBatchMentionQuantity?.unit ?? null}
                            onQuantityChange={quantity => onBatchMentionQuantityChange?.(singleBatchMention.mention, quantity)}
                            onUnitChange={unit => onBatchMentionQuantityUnitChange?.(singleBatchMention.mention, unit)}
                            text={singleBatchMention.text}
                            corpusId={corpusId}
                            constraints={objectConstraintSide ? effectivePredicateConstraints : null}
                            constraintSide={objectConstraintSide}
                            constraintPropertyLabel={predicateEntityLabel}
                            filteringEnabled={wikibasePredicateFiltering}
                          />
                        </div>
                      )}
                    </>
                  )
                : (
                    <SlotField
                      slotRole="object"
                      tag={objectTag}
                      entityValue={getEntityValue(currentAnnotation?.object, 'object')}
                      onEntityChange={newValue => handleEntityChange('object', newValue)}
                      unit={objectTag?.unit ?? null}
                      onUnitChange={unit => handleUnitChange('object', unit)}
                      quantity={objectTag && !hasEntityLink(objectTag)
                        ? {
                            value: objectTag.entityValue ?? '',
                            lowerBound: objectTag.quantityLowerBound ?? '',
                            upperBound: objectTag.quantityUpperBound ?? '',
                          }
                        : null}
                      onQuantityChange={quantity => handleQuantityChange('object', quantity)}
                      scrollTo={() => scrollToElement(objectTag)}
                      onRemove={() => removeTag('object')}
                      corpusId={corpusId}
                      constraints={objectConstraintSide ? effectivePredicateConstraints : null}
                      constraintSide={objectConstraintSide}
                      constraintPropertyLabel={predicateEntityLabel}
                      filteringEnabled={wikibasePredicateFiltering}
                    />
                  )}
            </div>
          </div>
          {batchMode && (batchMentionsCount ?? 0) > 1 && (
            <Collapsible className="pt-1">
              <CollapsibleTrigger
                className="group flex w-full items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-foreground/5"
              >
                <ChevronRightIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                {(() => {
                  const rows = batchMentionRows ?? []
                  const hasCells = rows.some(row => row.mention.kind === 'cell')
                  const hasSpans = rows.some(row => row.mention.kind === 'span')
                  const kindLabel = hasCells && hasSpans ? 'Per-selection' : hasSpans ? 'Per-span' : 'Per-cell'
                  return batchRole === 'subject'
                    ? `${kindLabel} subjects`
                    : batchRole === 'predicate' ? `${kindLabel} predicates` : `${kindLabel} objects`
                })()}
                <Badge variant="secondary" className="ml-auto font-normal">
                  {(() => {
                    const filled = (batchMentionRows ?? []).filter(row => row.filled)
                    const withValue = filled.filter(row =>
                      batchMentionEntities?.has(mentionKey(row.mention))
                      || batchMentionQuantities?.has(mentionKey(row.mention))).length
                    return `${withValue} of ${filled.length} set`
                  })()}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {(() => {
                  const filledRows = (batchMentionRows ?? []).filter(row => row.filled)
                  const anySet = filledRows.some(row =>
                    batchMentionEntities?.has(mentionKey(row.mention))
                    || batchMentionQuantities?.has(mentionKey(row.mention)))

                  return (
                    <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">Apply to all</span>
                      <div className="min-w-0 flex-1">
                        <EntitySelector
                          type={batchRole ?? 'subject'}
                          value={null}
                          onValueChange={(newValue) => {
                            if (!newValue) {
                              return
                            }
                            for (const row of filledRows) {
                              onBatchMentionEntityChange?.(row.mention, newValue)
                            }
                            onBatchQuantityClear?.()
                          }}
                          quantity={batchQuantityFields ?? { value: '', lowerBound: '', upperBound: '' }}
                          unit={batchQuantity?.unit ?? null}
                          onQuantityChange={quantity => onBatchQuantityApply?.({
                            ...quantity,
                            unit: batchQuantity?.unit ?? null,
                          })}
                          onUnitChange={unit => onBatchQuantityApply?.({
                            value: batchQuantity?.value ?? '',
                            lowerBound: batchQuantity?.lowerBound ?? '',
                            upperBound: batchQuantity?.upperBound ?? '',
                            unit,
                          })}
                          text=""
                          corpusId={corpusId}
                          constraints={batchConstraintSide ? effectivePredicateConstraints : null}
                          constraintSide={batchConstraintSide}
                          constraintPropertyLabel={predicateEntityLabel}
                          filteringEnabled={wikibasePredicateFiltering}
                        />
                      </div>
                      {anySet && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            for (const row of filledRows) {
                              onBatchMentionEntityChange?.(row.mention, null)
                              onBatchMentionQuantityChange?.(row.mention, null)
                            }
                            onBatchQuantityClear?.()
                          }}
                          aria-label="Clear entities and quantities for all selections"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })()}
                <div className="mt-1 flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
                  {(batchMentionRows ?? []).map(row => (
                    <div
                      key={mentionKey(row.mention)}
                      className={cn('flex items-center gap-2 rounded-md border px-2 py-1.5', !row.filled && 'bg-muted/40')}
                    >
                      {row.filled
                        ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="min-w-0 flex-1 truncate text-xs">{row.text}</span>
                              </TooltipTrigger>
                              <TooltipContent>{row.text}</TooltipContent>
                            </Tooltip>
                          )
                        : (
                            <span className="min-w-0 flex-1 text-xs text-muted-foreground">Empty cell</span>
                          )}
                      <div className="w-44 shrink-0">
                        {row.filled && (
                          <EntitySelector
                            type={batchRole ?? 'subject'}
                            value={batchMentionEntities?.get(mentionKey(row.mention)) ?? null}
                            onValueChange={newValue => onBatchMentionEntityChange?.(row.mention, newValue)}
                            quantity={(() => {
                              const mentionQuantity = batchMentionQuantities?.get(mentionKey(row.mention))
                              // Always a state object (possibly empty). The
                              // quantity view renders only when non-null.
                              return {
                                value: mentionQuantity?.value ?? '',
                                lowerBound: mentionQuantity?.lowerBound ?? '',
                                upperBound: mentionQuantity?.upperBound ?? '',
                              }
                            })()}
                            unit={batchMentionQuantities?.get(mentionKey(row.mention))?.unit ?? null}
                            onQuantityChange={quantity => onBatchMentionQuantityChange?.(row.mention, quantity)}
                            onUnitChange={unit => onBatchMentionQuantityUnitChange?.(row.mention, unit)}
                            text={row.text}
                            corpusId={corpusId}
                            constraints={batchConstraintSide ? effectivePredicateConstraints : null}
                            constraintSide={batchConstraintSide}
                            constraintPropertyLabel={predicateEntityLabel}
                            filteringEnabled={wikibasePredicateFiltering}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          {!batchMode && currentAnnotation && (
            <div className="pt-3">
              <div
                className={cn(
                  'flex items-center justify-between gap-2',
                  qualifiers.length > 0 && 'mb-2',
                )}
              >
                <h3 className="text-sm font-medium">
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
                        isExpanded && 'border-accent bg-accent/10',
                        !isExpanded
                        && qualifierHasValidationError
                        && 'border-destructive/40 bg-destructive/10',
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
