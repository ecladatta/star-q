import type {
  AnnotationComponentRole,
  AnnotationMention,
  AnnotationQualifierInput,
  CurrentAnnotation,
  CurrentAnnotationQualifier,
  DocumentAnnotation,
  DocumentAnnotationComponent,
  DocumentElement,
  Entity,
  EntityType,
  TextOrTableElement,
} from '@/types/types'
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
import { entityTypeForComponentRole, getAnnotationComponents } from '@/lib/annotation-roles'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { usePopoverState, useSelectionState } from './useSelectionState'

type QualifierSide = 'predicate' | 'value'

class AnnotationError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AnnotationError'
  }
}

function validateAnnotationComponent(component: DocumentAnnotationComponent | undefined): boolean {
  return !!(
    component
    && component.annotationValue?.trim()
    && (component.elementIndex === 0 || component.elementIndex)
  )
}

function validateAnnotationTriple(subject?: DocumentAnnotationComponent, predicate?: DocumentAnnotationComponent, object?: DocumentAnnotationComponent): string | null {
  if (!validateAnnotationComponent(subject)) {
    return 'Subject is required and must have valid text'
  }
  if (!validateAnnotationComponent(predicate)) {
    return 'Predicate is required and must have valid text'
  }
  if (!validateAnnotationComponent(object)) {
    return 'Object is required and must have valid text'
  }
  return null
}

function validateAnnotationQualifiers(qualifiers?: CurrentAnnotationQualifier[]): string[] {
  if (!qualifiers) {
    return []
  }

  return qualifiers.flatMap((qualifier, index) => {
    const qualifierNumber = index + 1
    const hasPredicateComponent = Boolean(qualifier.predicate)
    const hasValueComponent = Boolean(qualifier.value)
    const hasPredicate = validateAnnotationComponent(qualifier.predicate)
    const hasValue = validateAnnotationComponent(qualifier.value)

    if (!hasPredicateComponent && !hasValueComponent) {
      return [`Qualifier ${qualifierNumber} is empty; remove it or fill both fields`]
    }
    if (!hasPredicate) {
      return [`Qualifier ${qualifierNumber} predicate is required`]
    }
    if (!hasValue) {
      return [`Qualifier ${qualifierNumber} value is required`]
    }
    return []
  })
}

function createEntityFromComponent(component: DocumentAnnotationComponent): Entity {
  return {
    label: component.entityLabel || '',
    value: component.entityValue || '',
    custom: component.entityCustom || false,
    customId: component.entityCustomId || null,
    datatype: component.entityDatatype || null,
    type: entityTypeForComponentRole(component.annotationTag),
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
) {
  const [documentAnnotations, setDocumentAnnotations] = useState<DocumentAnnotation[]>(initialAnnotations)
  const [currentAnnotation, setCurrentAnnotation] = useState<CurrentAnnotation | null>(null)
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

    return componentsMap
  }, [documentAnnotations, currentAnnotation, showAnnotations])

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

    setLoadingState('annotationForm', true)

    try {
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
          setLoadingState('annotationForm', false)
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

      setCurrentAnnotation(null)
      popover.hidePopover()
    } catch (error) {
      const message = error instanceof AnnotationError
        ? error.message
        : `Failed to save annotation: ${(error as Error)?.message || 'Unknown error'}`
      toast.error(message)
      throw error
    } finally {
      setLoadingState('annotationForm', false)
    }
  }, [currentAnnotation, popover, setLoadingState, documentAnnotations])

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
  }, [selectedAnnotations, currentAnnotation, setLoadingState])

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
  }, [currentAnnotation, setLoadingState, popover])

  const createAnnotationComponent = useCallback((role: AnnotationComponentRole): DocumentAnnotationComponent | null => {
    if (!selection.hasSelection()) {
      toast.error('Please select some text to annotate.')
      return null
    }

    const { currentElementIndex, tableSelection, selectedOffset } = selection

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
      value = element.value as string || ''
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
  }, [popover])

  const addToCurrentAnnotation = useCallback((type: EntityType) => {
    const newComponent = createAnnotationComponent(type)
    if (!newComponent)
      return

    setCurrentAnnotation((prev: CurrentAnnotation | null) => ({
      ...prev,
      [type]: newComponent,
    }))

    selection.clearSelection()
  }, [createAnnotationComponent, selection])

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
  }, [])

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
  }, [createAnnotationComponent, popover, selection])

  const handleQualifierMentionAssociation = useCallback((side: QualifierSide) => {
    const mention = popover.popoverState.mentionData
    if (!mention) {
      return
    }

    const role: AnnotationComponentRole = side === 'predicate'
      ? 'qualifier-predicate'
      : 'qualifier-value'
    const component = createComponentFromMention(role, mention)

    setCurrentAnnotation((prev) => {
      if (!prev) {
        return prev
      }

      const qualifiers = prev.qualifiers ?? []
      const existingIndex = qualifiers.findIndex(qualifier => !qualifier[side])
      const qualifierToUpdate = existingIndex >= 0
        ? qualifiers[existingIndex]
        : { id: uuidv4(), position: qualifiers.length }
      const updatedQualifier = setQualifierComponent(qualifierToUpdate, side, component)
      const nextQualifiers = existingIndex >= 0
        ? qualifiers.map(qualifier => qualifier.id === updatedQualifier.id ? updatedQualifier : qualifier)
        : [...qualifiers, updatedQualifier]

      return {
        ...prev,
        qualifiers: reindexQualifiers(nextQualifiers),
      }
    })

    popover.hidePopover()
  }, [popover])

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
  }, [])

  const handleSelectionMentionAssociation = useCallback((type: EntityType) => {
    const mention = popover.popoverState.mentionData
    if (mention) {
      setCurrentAnnotation(prev => ({
        ...prev,
        [type]: createComponentFromMention(type, mention),
      }))
      popover.hidePopover()
      return
    }

    if (popover.popoverState.annotation && popover.popoverState.componentId) {
      handleMentionAssociation(type)
    } else {
      addToCurrentAnnotation(type)
    }
    popover.hidePopover()
  }, [addToCurrentAnnotation, handleMentionAssociation, popover])

  const handleCloneAnnotation = useCallback((annotation?: DocumentAnnotation) => {
    const annotationToClone = annotation || popover.popoverState.annotation
    if (!annotationToClone) {
      return
    }

    // Create cloned components with new IDs
    const cloneComponent = (comp: DocumentAnnotationComponent | undefined): DocumentAnnotationComponent | undefined => {
      if (!comp) {
        return undefined
      }
      return {
        ...comp,
        id: uuidv4(),
      }
    }

    setCurrentAnnotation({
      subject: cloneComponent(annotationToClone.subject),
      predicate: cloneComponent(annotationToClone.predicate),
      object: cloneComponent(annotationToClone.object),
      qualifiers: annotationToClone.qualifiers.map((qualifier, position) => ({
        id: uuidv4(),
        position,
        predicate: cloneComponent(qualifier.predicate),
        value: cloneComponent(qualifier.value),
      })),
    })

    popover.hidePopover()
    toast.success('Annotation cloned! Edit and save to create a new annotation.')
  }, [popover])

  useKeyboardShortcuts({
    popoverVisible: popover.popoverState.visible,
    hasSelection: selection.hasSelection(),
    currentAnnotation: popover.popoverState.annotation,
    onAnnotationAction: handleSelectionMentionAssociation,
    onEditCurrentAnnotation: () => {
      if (popover.popoverState.annotation) {
        setCurrentAnnotation(popover.popoverState.annotation)
        popover.hidePopover()
      }
    },
    onClearAnnotation: () => setCurrentAnnotation(null),
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
    setCurrentAnnotation,
    selectedAnnotations,
    documentElements,

    // Loading states
    annotationFormLoading: loadingStates.annotationForm,
    isDeletingAnnotation: loadingStates.deletingAnnotation,
    isBatchDeleting: loadingStates.batchDeleting,

    // Validation
    currentAnnotationValidation,

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
    handleQualifierMentionAssociation,
    updateQualifierEntity,
    handleCloneAnnotation,

    // Sub-hooks
    selection,
    popover,
  } as const
}
