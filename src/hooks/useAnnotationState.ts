import type { SetStateAction } from 'react'
import type {
  AnnotationComponentRole,
  AnnotationMention,
  AnnotationQualifierInput,
  CurrentAnnotation,
  CurrentAnnotationQualifier,
  DocumentAnnotation,
  DocumentAnnotationComponent,
  DocumentElement,
  EditCurrentAnnotation,
  Entity,
  EntityType,
  TextOrTableElement,
} from '@/types/types'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import {
  addAnnotation,
  deleteAnnotation,
  deleteAnnotations,
  getAnnotationById,
  updateAnnotation,
} from '@/actions/annotation/annotationActions'
import { clearIfStillCurrent, cloneAsNewAnnotation, computeHasUnsavedChanges, resolveSwitchOutcome, serializeAnnotationForDirtyCheck } from '@/lib/annotation-dirty'
import { decideParamTransition } from '@/lib/annotation-param-sync'
import { createEntityFromComponent, getAnnotationComponents } from '@/lib/annotation-roles'
import { validateAnnotationComponent, validateAnnotationQualifiers, validateAnnotationTriple } from '@/lib/annotation-validation'
import { useAnnotationBatch } from './useAnnotationBatch'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { usePopoverState, useSelectionState } from './useSelectionState'

type QualifierSide = 'predicate' | 'value'

type SwitchOptions = {
  onApplied?: () => void
  revert?: () => void
}

type PendingSwitch = {
  apply: () => void
  revert?: () => void
}

class AnnotationError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AnnotationError'
  }
}

function createQualifierInputs(qualifiers: CurrentAnnotationQualifier[]): AnnotationQualifierInput[] {
  return qualifiers.map((qualifier, index) => {
    const validationError = validateAnnotationQualifiers([qualifier])[0]
    if (validationError || !qualifier.predicate || !qualifier.value) {
      throw new AnnotationError(validationError ?? 'Invalid qualifier', 'VALIDATION_ERROR')
    }

    return {
      id: qualifier.id,
      predicate: qualifier.predicate,
      predicateEntity: createEntityFromComponent(qualifier.predicate),
      value: qualifier.value,
      valueEntity: createEntityFromComponent(qualifier.value),
      position: index,
    }
  })
}

function updateComponentEntity(
  component: DocumentAnnotationComponent,
  newValue: Entity | null,
): DocumentAnnotationComponent {
  return {
    ...component,
    entityLabel: newValue?.label || null,
    entityValue: newValue?.value || null,
    entityCustom: newValue?.custom || false,
    entityCustomId: newValue?.customId || null,
    entityDatatype: newValue?.datatype || null,
  }
}

function reindexQualifiers(qualifiers: CurrentAnnotationQualifier[]): CurrentAnnotationQualifier[] {
  return qualifiers.map((qualifier, position) => ({
    ...qualifier,
    position,
  }))
}

function setQualifierComponent(
  qualifier: CurrentAnnotationQualifier,
  side: QualifierSide,
  component: DocumentAnnotationComponent,
): CurrentAnnotationQualifier {
  return side === 'predicate'
    ? { ...qualifier, predicate: component }
    : { ...qualifier, value: component }
}

function addQualifierComponent(
  annotation: CurrentAnnotation,
  side: QualifierSide,
  component: DocumentAnnotationComponent,
): CurrentAnnotation {
  const qualifiers = annotation.qualifiers ?? []
  const existingIndex = qualifiers.findIndex(qualifier => !qualifier[side])
  const qualifierToUpdate = existingIndex >= 0
    ? qualifiers[existingIndex]
    : { id: uuidv4(), position: qualifiers.length }
  const updatedQualifier = setQualifierComponent(qualifierToUpdate, side, component)
  const nextQualifiers = existingIndex >= 0
    ? qualifiers.map(qualifier => qualifier.id === updatedQualifier.id ? updatedQualifier : qualifier)
    : [...qualifiers, updatedQualifier]

  return {
    ...annotation,
    qualifiers: reindexQualifiers(nextQualifiers),
  }
}

function componentsAreEqual(comp1: DocumentAnnotationComponent, comp2: DocumentAnnotationComponent): boolean {
  return (
    comp1.elementIndex === comp2.elementIndex
    && comp1.annotationStart === comp2.annotationStart
    && comp1.annotationEnd === comp2.annotationEnd
    && comp1.annotationRow === comp2.annotationRow
    && comp1.annotationCell === comp2.annotationCell
    && comp1.annotationValue === comp2.annotationValue
    && comp1.annotationType === comp2.annotationType
  )
}

function isDuplicateAnnotation(
  subject: DocumentAnnotationComponent,
  predicate: DocumentAnnotationComponent,
  object: DocumentAnnotationComponent,
  existingAnnotations: DocumentAnnotation[],
): boolean {
  return existingAnnotations.some(annotation =>
    componentsAreEqual(annotation.subject, subject)
    && componentsAreEqual(annotation.predicate, predicate)
    && componentsAreEqual(annotation.object, object),
  )
}

function createComponentFromMention(role: AnnotationComponentRole, mention: AnnotationMention): DocumentAnnotationComponent {
  return {
    id: uuidv4(),
    entityLabel: null,
    entityValue: null,
    entityCustom: null,
    entityCustomId: null,
    entityDatatype: null,
    unit: null,
    quantityLowerBound: null,
    quantityUpperBound: null,
    annotationStart: mention.start,
    annotationEnd: mention.end,
    annotationRow: mention.row,
    annotationCell: mention.cell,
    annotationValue: mention.value,
    annotationType: mention.annotationType,
    annotationTag: role,
    elementIndex: mention.elementIndex,
  }
}

export function useAnnotationState(
  initialAnnotations: DocumentAnnotation[] = [],
  combinedElements: TextOrTableElement[],
  showAnnotations: boolean,
  setShowAnnotations: (show: boolean) => void,
  readOnly = false,
  scrollToAnnotation?: (annotation: DocumentAnnotation) => void,
) {
  const [documentAnnotations, setDocumentAnnotations] = useState<DocumentAnnotation[]>(initialAnnotations)
  const [currentAnnotationState, setCurrentAnnotationState] = useState<CurrentAnnotation | null>(null)
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null)
  const pendingSwitchRef = useRef<PendingSwitch | null>(null)
  const initialAnnotationSnapshotRef = useRef<string | null>(null)
  const currentAnnotation = currentAnnotationState
  const currentAnnotationRef = useRef<CurrentAnnotation | null>(null)

  const searchParams = useSearchParams()
  const annotationParam = searchParams.get('annotation')
  const handledParamRef = useRef<string | null>(null)

  // Shallow history write, not router.replace. A search-param navigation is a
  // full App Router transition (RSC round trip included) and commits late,
  // late enough for the user to close the editor before it lands, which used
  // to resurrect the annotation. replaceState applies synchronously, and
  // useSearchParams still picks it up.
  const writeUrl = useCallback((next: string | null) => {
    const params = new URLSearchParams(window.location.search)
    if (next) {
      params.set('annotation', next)
    } else {
      params.delete('annotation')
    }
    const query = params.toString()
    if (query === window.location.search.slice(1)) {
      return
    }
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [])

  const stashPendingSwitch = useCallback((pending: PendingSwitch | null) => {
    pendingSwitchRef.current = pending
    setPendingSwitch(pending)
  }, [])

  const setCurrentAnnotation = useCallback((update: SetStateAction<CurrentAnnotation | null>) => {
    const previous = currentAnnotationRef.current
    const next = typeof update === 'function' ? update(previous) : update
    if (next?.id !== previous?.id) {
      initialAnnotationSnapshotRef.current = next
        ? serializeAnnotationForDirtyCheck(next)
        : null
      const nextId = next?.id ?? null
      writeUrl(nextId)
      handledParamRef.current = nextId
    }
    currentAnnotationRef.current = next
    setCurrentAnnotationState(next)

    if (pendingSwitchRef.current !== null && !computeHasUnsavedChanges(next, initialAnnotationSnapshotRef.current)) {
      stashPendingSwitch(null)
    }
  }, [stashPendingSwitch, writeUrl])

  const editCurrentAnnotation = useCallback<EditCurrentAnnotation>((update) => {
    setCurrentAnnotation(prev => (typeof update === 'function' ? update(prev) : null))
  }, [setCurrentAnnotation])

  const [selectedAnnotations, setSelectedAnnotations] = useState<Set<string>>(() => new Set())
  const [loadingStates, setLoadingStates] = useState({
    annotationForm: false,
    deletingAnnotation: false,
    batchDeleting: false,
  })
  const elementsRef = useRef<DocumentElement[]>([])
  const selection = useSelectionState()
  const popover = usePopoverState()

  const currentAnnotationValidation = useMemo(() => {
    if (!currentAnnotation) {
      return { isValid: false, errors: [] }
    }

    const errors: string[] = []
    const validationChecks = [
      { component: currentAnnotation.subject, name: 'Subject' },
      { component: currentAnnotation.predicate, name: 'Predicate' },
      { component: currentAnnotation.object, name: 'Object' },
    ]

    validationChecks.forEach(({ component, name }) => {
      if (!validateAnnotationComponent(component)) {
        errors.push(`${name} is required`)
      }
    })
    errors.push(...validateAnnotationQualifiers(currentAnnotation.qualifiers))

    return { isValid: errors.length === 0, errors }
  }, [currentAnnotation])

  const annotationBatch = useAnnotationBatch({
    rawElements: combinedElements,
    documentAnnotations,
    currentAnnotation,
    editCurrentAnnotation,
    setDocumentAnnotations,
    popover,
  })

  const hasUnsavedChanges = computeHasUnsavedChanges(
    currentAnnotation,
    initialAnnotationSnapshotRef.current,
  )

  const isDirtyNow = useCallback(() => computeHasUnsavedChanges(
    currentAnnotationRef.current,
    initialAnnotationSnapshotRef.current,
  ), [])

  const applySwitch = useCallback((next: CurrentAnnotation | null, options?: SwitchOptions) => {
    const finish = () => {
      initialAnnotationSnapshotRef.current = next
        ? serializeAnnotationForDirtyCheck(next)
        : null
      setCurrentAnnotation(next)
      options?.onApplied?.()
    }

    const outcome = resolveSwitchOutcome({
      readOnly,
      hasUnsavedChanges: isDirtyNow(),
    })
    if (outcome === 'apply') {
      finish()
      return
    }

    stashPendingSwitch({ apply: finish, revert: options?.revert })
  }, [isDirtyNow, readOnly, setCurrentAnnotation, stashPendingSwitch])

  const restoreUrlFromState = useCallback(() => {
    const currentId = currentAnnotationRef.current?.id ?? null
    writeUrl(currentId)
    handledParamRef.current = currentId
  }, [writeUrl])

  const openAnnotation = useCallback((annotation: DocumentAnnotation, options?: { scroll?: boolean, onApplied?: () => void }) => {
    const scroll = options?.scroll !== false && scrollToAnnotation
      ? () => scrollToAnnotation(annotation)
      : undefined
    const onApplied = options?.onApplied || scroll
      ? () => {
          options?.onApplied?.()
          scroll?.()
        }
      : undefined

    applySwitch(annotation, { onApplied })
  }, [applySwitch, scrollToAnnotation])

  const closeAnnotation = useCallback(() => {
    applySwitch(null)
  }, [applySwitch])

  const toggleAnnotation = useCallback((annotation: DocumentAnnotation) => {
    if (annotation.id === currentAnnotationRef.current?.id) {
      closeAnnotation()
    } else {
      openAnnotation(annotation)
    }
  }, [closeAnnotation, openAnnotation])

  const requestCloseCurrentAnnotation = useCallback(() => {
    const close = () => annotationBatch.batchMode
      ? annotationBatch.exitBatchMode()
      : setCurrentAnnotation(null)

    const outcome = resolveSwitchOutcome({
      readOnly,
      hasUnsavedChanges: isDirtyNow(),
    })
    if (outcome === 'apply') {
      close()
      return
    }

    stashPendingSwitch({ apply: close })
  }, [annotationBatch, isDirtyNow, readOnly, setCurrentAnnotation, stashPendingSwitch])

  const confirmPendingSwitch = useCallback(() => {
    const pending = pendingSwitchRef.current
    stashPendingSwitch(null)
    pending?.apply()
  }, [stashPendingSwitch])

  const cancelPendingSwitch = useCallback(() => {
    const pending = pendingSwitchRef.current
    stashPendingSwitch(null)
    pending?.revert?.()
  }, [stashPendingSwitch])

  useEffect(() => {
    const paramFound = annotationParam !== null
      && documentAnnotations.some(annotation => annotation.id === annotationParam)
    const { decision, handledParam } = decideParamTransition({
      param: annotationParam,
      live: new URLSearchParams(window.location.search).get('annotation'),
      handledParam: handledParamRef.current,
      currentId: currentAnnotationRef.current?.id ?? null,
      paramFound,
      annotationsLoaded: documentAnnotations.length > 0,
    })
    handledParamRef.current = handledParam

    if (decision.kind === 'close') {
      applySwitch(null, { revert: restoreUrlFromState })
    } else if (decision.kind === 'open') {
      const target = documentAnnotations.find(annotation => annotation.id === decision.annotationId)
      if (target) {
        applySwitch(target, {
          onApplied: scrollToAnnotation ? () => scrollToAnnotation(target) : undefined,
          revert: restoreUrlFromState,
        })
      }
    } else if (decision.kind === 'clear') {
      writeUrl(null)
    }
  }, [annotationParam, applySwitch, documentAnnotations, restoreUrlFromState, scrollToAnnotation, writeUrl])

  const annotationComponentsMap = useMemo(() => {
    const componentsMap = new Map<number, DocumentAnnotationComponent[]>()

    // Process existing annotations
    documentAnnotations.forEach((annotation) => {
      if (!showAnnotations && annotation.id !== currentAnnotation?.id)
        return

      const activeAnnotation = annotation.id === currentAnnotation?.id ? currentAnnotation : annotation
      const components = getAnnotationComponents(activeAnnotation)

      components.forEach((component) => {
        const elementIndex = component.elementIndex
        if (elementIndex !== null && elementIndex !== undefined) {
          if (!componentsMap.has(elementIndex)) {
            componentsMap.set(elementIndex, [])
          }
          componentsMap.get(elementIndex)!.push(component)
        }
      })
    })

    // Process current annotation being built
    if (currentAnnotation) {
      const currentComponents = getAnnotationComponents(currentAnnotation)

      currentComponents.forEach((component) => {
        const elementIndex = component.elementIndex
        if (elementIndex !== null && elementIndex !== undefined) {
          if (!componentsMap.has(elementIndex)) {
            componentsMap.set(elementIndex, [])
          }
          const existing = componentsMap.get(elementIndex)!
          if (!existing.some(c => c.id === component.id)) {
            existing.push(component)
          }
        }
      })
    }

    for (const component of annotationBatch.stagedSpanComponents) {
      if (!componentsMap.has(component.elementIndex)) {
        componentsMap.set(component.elementIndex, [])
      }
      const existing = componentsMap.get(component.elementIndex)!
      if (!existing.some(c => c.id === component.id)) {
        existing.push(component)
      }
    }

    return componentsMap
  }, [documentAnnotations, currentAnnotation, showAnnotations, annotationBatch.stagedSpanComponents])

  const documentElements = useMemo(() => {
    return combinedElements.map(element => ({
      ...element,
      components: annotationComponentsMap.get(element.elementIndex) || [],
    }))
  }, [combinedElements, annotationComponentsMap])

  useEffect(() => {
    elementsRef.current = documentElements
  }, [documentElements])

  const setLoadingState = useCallback((key: keyof typeof loadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }))
  }, [])

  const createAnnotation = useCallback(async (
    documentId: string,
    subject: DocumentAnnotationComponent,
    predicate: DocumentAnnotationComponent,
    object: DocumentAnnotationComponent,
  ) => {
    setLoadingState('annotationForm', true)
    const savingAnnotation = currentAnnotation

    try {
      const validationError = validateAnnotationTriple(subject, predicate, object)
      if (validationError) {
        throw new AnnotationError(validationError, 'VALIDATION_ERROR')
      }
      const qualifierValidationErrors = validateAnnotationQualifiers(currentAnnotation?.qualifiers)
      if (qualifierValidationErrors.length > 0) {
        throw new AnnotationError(qualifierValidationErrors[0], 'VALIDATION_ERROR')
      }

      const qualifierInputs = currentAnnotation?.qualifiers === undefined
        ? undefined
        : createQualifierInputs(currentAnnotation.qualifiers)

      const selectedSubject = createEntityFromComponent(subject)
      const selectedPredicate = createEntityFromComponent(predicate)
      const selectedObject = createEntityFromComponent(object)

      let updatedAnnotation: DocumentAnnotation

      if (currentAnnotation?.id) {
        // Update existing annotation
        await updateAnnotation(
          currentAnnotation.id,
          subject,
          selectedSubject,
          predicate,
          selectedPredicate,
          object,
          selectedObject,
          qualifierInputs,
        )
        updatedAnnotation = await getAnnotationById(currentAnnotation.id)

        setDocumentAnnotations(prev =>
          prev.map(ann => ann.id === currentAnnotation.id ? updatedAnnotation : ann),
        )
        toast.success('Annotation updated!')
      } else {
        // Check for duplicate annotations before creating new one
        if (isDuplicateAnnotation(subject, predicate, object, documentAnnotations)) {
          toast.error('An identical annotation already exists')
          return
        }

        // Create new annotation
        const annotationId = await addAnnotation(
          documentId,
          subject,
          selectedSubject,
          predicate,
          selectedPredicate,
          object,
          selectedObject,
          qualifierInputs ?? [],
        )
        updatedAnnotation = await getAnnotationById(annotationId)

        setDocumentAnnotations(prev => [...prev, updatedAnnotation])
        toast.success('Annotation created!')
      }

      setCurrentAnnotation(prev => clearIfStillCurrent(prev, savingAnnotation))
      popover.hidePopover()
    } catch (error) {
      const message = error instanceof AnnotationError
        ? error.message
        : `Failed to save annotation: ${(error as Error)?.message || 'Unknown error'}`
      toast.error(message)
    } finally {
      setLoadingState('annotationForm', false)
    }
  }, [currentAnnotation, popover, setCurrentAnnotation, setLoadingState, documentAnnotations])

  const handleAnnotationSelect = useCallback((annotationId: string, selected: boolean) => {
    setSelectedAnnotations((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(annotationId)
      } else {
        newSet.delete(annotationId)
      }
      return newSet
    })
  }, [])

  const handleBatchDelete = useCallback(async () => {
    if (selectedAnnotations.size === 0)
      return

    setLoadingState('batchDeleting', true)

    try {
      const annotationIds = Array.from(selectedAnnotations)
      await deleteAnnotations(annotationIds)

      setDocumentAnnotations(prev =>
        prev.filter(ann => !selectedAnnotations.has(ann.id)),
      )
      setSelectedAnnotations(new Set())

      if (currentAnnotation?.id && selectedAnnotations.has(currentAnnotation.id)) {
        setCurrentAnnotation(null)
      }

      const count = annotationIds.length
      toast.success(`${count} annotation${count > 1 ? 's' : ''} deleted!`)
    } catch (error) {
      toast.error(`Failed to delete annotations: ${(error as Error)?.message || 'Unknown error'}`)
    } finally {
      setLoadingState('batchDeleting', false)
    }
  }, [selectedAnnotations, currentAnnotation, setCurrentAnnotation, setLoadingState])

  const deleteAnnotationById = useCallback(async (annotationId: string) => {
    setLoadingState('deletingAnnotation', true)

    try {
      await deleteAnnotation(annotationId)

      setDocumentAnnotations(prev => prev.filter(ann => ann.id !== annotationId))
      setSelectedAnnotations((prev) => {
        const newSet = new Set(prev)
        newSet.delete(annotationId)
        return newSet
      })

      if (currentAnnotation?.id === annotationId) {
        setCurrentAnnotation(null)
      }

      // Update popover state to remove the deleted annotation
      popover.setPopoverState(prev => ({
        ...prev,
        annotations: prev.annotations.filter(ann => ann.id !== annotationId),
      }))

      toast.success('Annotation deleted!')
    } catch (error) {
      toast.error(`Failed to delete annotation: ${(error as Error)?.message || 'Unknown error'}`)
    } finally {
      setLoadingState('deletingAnnotation', false)
    }
  }, [currentAnnotation, setCurrentAnnotation, setLoadingState, popover])

  const createAnnotationComponent = useCallback((role: AnnotationComponentRole): DocumentAnnotationComponent | null => {
    if (!selection.hasSelection()) {
      toast.error('Please select some text to annotate.')
      return null
    }

    const { currentElementIndex, tableSelection, selectedOffset, selectedTextSource } = selection

    if (currentElementIndex === null)
      return null

    const element = combinedElements[currentElementIndex]
    if (!element)
      return null

    const currentElementType = element.type
    if (currentElementType === 'table' && !tableSelection)
      return null

    // Extract value based on element type
    let value = ''
    if (currentElementType === 'text') {
      value = selectedTextSource ?? (element.value as string) ?? ''
    } else if (currentElementType === 'table' && tableSelection) {
      const tableData = element.value as string[][]
      value = tableData?.[tableSelection.rowIndex]?.[tableSelection.cellIndex] || ''
    }

    const selectedText = value.slice(selectedOffset.start, selectedOffset.end)
    const trimmedText = selectedText.trim()

    if (!trimmedText) {
      toast.error('Selected text is empty.')
      return null
    }

    // Calculate actual boundaries excluding whitespace
    const leadingWhitespace = selectedText.length - selectedText.trimStart().length
    const trailingWhitespace = selectedText.length - selectedText.trimEnd().length
    const actualStart = selectedOffset.start + leadingWhitespace
    const actualEnd = selectedOffset.end - trailingWhitespace

    return {
      id: uuidv4(),
      entityLabel: null,
      entityValue: null,
      entityCustomId: null,
      entityCustom: null,
      entityDatatype: null,
      unit: null,
      quantityLowerBound: null,
      quantityUpperBound: null,
      annotationStart: actualStart,
      annotationEnd: actualEnd,
      annotationRow: tableSelection?.rowIndex ?? null,
      annotationCell: tableSelection?.cellIndex ?? null,
      annotationValue: trimmedText,
      annotationType: currentElementType,
      annotationTag: role,
      elementIndex: currentElementIndex,
    }
  }, [selection, combinedElements])

  const handleMentionAssociation = useCallback((type: EntityType) => {
    if (!popover.popoverState.annotation || !popover.popoverState.componentId)
      return

    const { annotation, componentId } = popover.popoverState
    const component = getAnnotationComponents(annotation).find(component => component.id === componentId)
    if (!component)
      return

    setCurrentAnnotation(prev => ({
      ...prev,
      [type]: {
        id: uuidv4(),
        entityLabel: null,
        entityValue: null,
        entityCustom: null,
        entityCustomId: null,
        entityDatatype: null,
        unit: null,
        quantityLowerBound: null,
        quantityUpperBound: null,
        annotationStart: component.annotationStart,
        annotationEnd: component.annotationEnd,
        annotationRow: component.annotationRow,
        annotationCell: component.annotationCell,
        annotationValue: component.annotationValue,
        annotationType: component.annotationType,
        annotationTag: type,
        elementIndex: component.elementIndex,
      },
    }))

    popover.hidePopover()
  }, [popover, setCurrentAnnotation])

  const addToCurrentAnnotation = useCallback((type: EntityType) => {
    const newComponent = createAnnotationComponent(type)
    if (!newComponent)
      return

    setCurrentAnnotation((prev: CurrentAnnotation | null) => ({
      ...prev,
      [type]: newComponent,
    }))

    selection.clearSelection()
  }, [createAnnotationComponent, selection, setCurrentAnnotation])

  const removeQualifier = useCallback((qualifierId: string) => {
    setCurrentAnnotation((prev) => {
      if (!prev?.qualifiers) {
        return prev
      }

      return {
        ...prev,
        qualifiers: reindexQualifiers(prev.qualifiers.filter(qualifier => qualifier.id !== qualifierId)),
      }
    })
  }, [setCurrentAnnotation])

  const assignSelectionToQualifier = useCallback((qualifierId: string, side: QualifierSide) => {
    const role: AnnotationComponentRole = side === 'predicate'
      ? 'qualifier-predicate'
      : 'qualifier-value'
    const newComponent = createAnnotationComponent(role)
    if (!newComponent) {
      return
    }

    setCurrentAnnotation((prev) => {
      const qualifiers = prev?.qualifiers ?? []
      const existingIndex = qualifiers.findIndex(qualifier => qualifier.id === qualifierId)
      const qualifierToUpdate = existingIndex >= 0
        ? qualifiers[existingIndex]
        : { id: qualifierId, position: qualifiers.length }
      const updatedQualifier = setQualifierComponent(qualifierToUpdate, side, newComponent)
      const nextQualifiers = existingIndex >= 0
        ? qualifiers.map(qualifier => qualifier.id === qualifierId ? updatedQualifier : qualifier)
        : [...qualifiers, updatedQualifier]

      return {
        ...prev,
        qualifiers: reindexQualifiers(nextQualifiers),
      }
    })

    selection.clearSelection()
    popover.hidePopover()
  }, [createAnnotationComponent, popover, selection, setCurrentAnnotation])

  const assignSelectionToNextQualifier = useCallback((side: QualifierSide) => {
    const role: AnnotationComponentRole = side === 'predicate'
      ? 'qualifier-predicate'
      : 'qualifier-value'
    const newComponent = createAnnotationComponent(role)
    if (!newComponent) {
      return
    }

    setCurrentAnnotation((prev) => {
      if (!prev) {
        return prev
      }

      return addQualifierComponent(prev, side, newComponent)
    })

    selection.clearSelection()
    popover.hidePopover()
  }, [createAnnotationComponent, popover, selection, setCurrentAnnotation])

  const updateQualifierEntity = useCallback((qualifierId: string, side: QualifierSide, newValue: Entity | null) => {
    setCurrentAnnotation((prev) => {
      if (!prev?.qualifiers) {
        return prev
      }

      return {
        ...prev,
        qualifiers: prev.qualifiers.map((qualifier) => {
          if (qualifier.id !== qualifierId) {
            return qualifier
          }

          const component = qualifier[side]
          if (!component) {
            return qualifier
          }

          return side === 'predicate'
            ? { ...qualifier, predicate: updateComponentEntity(component, newValue) }
            : { ...qualifier, value: updateComponentEntity(component, newValue) }
        }),
      }
    })
  }, [setCurrentAnnotation])

  const clearQualifierSide = useCallback((qualifierId: string, side: QualifierSide) => {
    setCurrentAnnotation((prev) => {
      if (!prev?.qualifiers) {
        return prev
      }

      return {
        ...prev,
        qualifiers: prev.qualifiers.map((qualifier) => {
          if (qualifier.id !== qualifierId) {
            return qualifier
          }

          return side === 'predicate'
            ? { ...qualifier, predicate: undefined }
            : { ...qualifier, value: undefined }
        }),
      }
    })
  }, [setCurrentAnnotation])

  const handleSelectionMentionAssociation = useCallback((type: EntityType, modifiers?: { shift?: boolean }) => {
    if (readOnly) {
      return
    }

    if (
      modifiers?.shift
      && selection.hasSelection()
      && !popover.popoverState.isTableCell
      && combinedElements[selection.currentElementIndex ?? -1]?.type === 'text'
      // A running batch of a different role is claimed by plain association.
      && !(annotationBatch.batchMode && annotationBatch.batchRole !== type)
    ) {
      const stagedComponent = createAnnotationComponent(type)
      if (stagedComponent) {
        annotationBatch.stageSpanBatch({
          role: type,
          stagedComponent,
          foldedComponent: currentAnnotation?.[type] ?? null,
        })
        selection.clearSelection()
        popover.hidePopover()
        return
      }
    }

    if (annotationBatch.batchMode && annotationBatch.batchRole === type) {
      // The keystroke refers to the latest selection, which claims the role
      // the docked batch's mentions occupy. Drop the mentions entirely and fall
      // back to a regular annotation with this selection as the role.
      annotationBatch.releaseMentions()
    }

    if (popover.popoverState.isTableCell && selection.tableSelection) {
      addToCurrentAnnotation(type)
      popover.hidePopover()
      return
    }

    const mention = popover.popoverState.mentionData
    if (mention) {
      setCurrentAnnotation(prev => ({
        ...prev,
        [type]: createComponentFromMention(type, mention),
      }))
      selection.clearSelection()
      popover.hidePopover()
      return
    }

    if (popover.popoverState.annotation && popover.popoverState.componentId) {
      handleMentionAssociation(type)
    } else {
      addToCurrentAnnotation(type)
    }
    popover.hidePopover()
  }, [addToCurrentAnnotation, handleMentionAssociation, popover, readOnly, selection, annotationBatch, combinedElements, createAnnotationComponent, currentAnnotation, setCurrentAnnotation])

  const handleCloneAnnotation = useCallback((annotation?: CurrentAnnotation | DocumentAnnotation) => {
    const annotationToClone = annotation || popover.popoverState.annotation
    if (!annotationToClone) {
      return
    }

    applySwitch(cloneAsNewAnnotation(annotationToClone), {
      onApplied: () => {
        popover.hidePopover()
        toast.success('Annotation cloned! Edit and save to create a new annotation.')
      },
    })
  }, [applySwitch, popover])

  useKeyboardShortcuts({
    popoverVisible: popover.popoverState.visible,
    hasSelection: selection.hasSelection(),
    currentAnnotation: popover.popoverState.annotation,
    onAnnotationAction: (type, modifiers) => {
      // A visible selection popover means the user just made a new text or
      // cell selection: the keystroke refers to it, not to the docked batch.
      if (popover.popoverState.visible) {
        handleSelectionMentionAssociation(type, modifiers)
        return
      }

      // Staged cells waiting on the anchored role popover (drags, columns,
      // rows, select-all): the keystroke picks the batch's role.
      if (annotationBatch.mentions.length > 0 && !annotationBatch.batchMode) {
        annotationBatch.setBatchRole(type)
        annotationBatch.openBatchMode()
        return
      }

      handleSelectionMentionAssociation(type, modifiers)
    },
    onEditCurrentAnnotation: () => {
      const target = popover.popoverState.annotation
      if (target) {
        openAnnotation(target, { scroll: false, onApplied: popover.hidePopover })
      }
    },
    onClearAnnotation: () => {
      if (currentAnnotation) {
        requestCloseCurrentAnnotation()
        return
      }

      setCurrentAnnotation(null)
    },
    onCancelBatchDrag: annotationBatch.cancelDrag,
    onExitBatchMode: annotationBatch.exitBatchMode,
    batchHasMentions: annotationBatch.mentions.length > 0,
    hasInProgressAnnotation: currentAnnotation !== null,
    onHidePopover: popover.hidePopover,
    onToggleAnnotations: () => setShowAnnotations(!showAnnotations),
    onCloneAnnotation: handleCloneAnnotation,
    onDeleteAnnotation: () => {
      if (popover.popoverState.annotation) {
        // Trigger the delete button click to open the confirmation popover
        const deleteButton = document.querySelector('[data-delete-annotation-popover-trigger]') as HTMLButtonElement
        if (deleteButton) {
          deleteButton.click()
        }
      }
    },
  })

  return {
    // State
    documentAnnotations,
    currentAnnotation,
    editCurrentAnnotation,
    selectedAnnotations,
    documentElements,

    // Loading states
    annotationFormLoading: loadingStates.annotationForm,
    isDeletingAnnotation: loadingStates.deletingAnnotation,
    isBatchDeleting: loadingStates.batchDeleting,

    // Validation
    currentAnnotationValidation,

    hasUnsavedChanges,
    discardDialogOpen: pendingSwitch !== null,
    openAnnotation,
    toggleAnnotation,
    requestCloseCurrentAnnotation,
    confirmPendingSwitch,
    cancelPendingSwitch,

    // Actions
    handleAnnotationSelect,
    handleBatchDelete,
    createAnnotation,
    deleteAnnotationById,
    handleMentionAssociation,
    handleSelectionMentionAssociation,
    addToCurrentAnnotation,
    removeQualifier,
    assignSelectionToQualifier,
    assignSelectionToNextQualifier,
    updateQualifierEntity,
    clearQualifierSide,
    handleCloneAnnotation,

    // Sub-hooks
    selection,
    popover,
    annotationBatch,
  } as const
}
