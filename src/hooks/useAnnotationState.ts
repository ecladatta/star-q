import type {
  CurrentAnnotation,
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
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { usePopoverState, useSelectionState } from './useSelectionState'

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

function createEntityFromComponent(component: DocumentAnnotationComponent, type: EntityType): Entity {
  return {
    label: component.entityLabel || '',
    value: component.entityValue || '',
    custom: component.entityCustom || false,
    customId: component.entityCustomId || null,
    datatype: component.entityDatatype || null,
    type,
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

    return { isValid: errors.length === 0, errors }
  }, [currentAnnotation])

  const annotationComponentsMap = useMemo(() => {
    const componentsMap = new Map<number, DocumentAnnotationComponent[]>()

    // Process existing annotations
    documentAnnotations.forEach((annotation) => {
      if (!showAnnotations && annotation.id !== currentAnnotation?.id)
        return

      const activeAnnotation = annotation.id === currentAnnotation?.id ? currentAnnotation : annotation
      const components = [activeAnnotation.subject, activeAnnotation.predicate, activeAnnotation.object]
        .filter((comp): comp is DocumentAnnotationComponent => !!comp)

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
      const currentComponents = [
        currentAnnotation.subject,
        currentAnnotation.predicate,
        currentAnnotation.object,
      ].filter((comp): comp is DocumentAnnotationComponent => !!comp)

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

    setLoadingState('annotationForm', true)

    try {
      const selectedSubject = createEntityFromComponent(subject, 'subject')
      const selectedPredicate = createEntityFromComponent(predicate, 'predicate')
      const selectedObject = createEntityFromComponent(object, 'object')

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
        )
        updatedAnnotation = await getAnnotationById(currentAnnotation.id)

        setDocumentAnnotations(prev =>
          prev.map(ann => ann.id === currentAnnotation.id ? updatedAnnotation : ann),
        )
        toast.success('Annotation updated!')
      } else {
        // Create new annotation
        const annotationId = await addAnnotation(
          documentId,
          subject,
          selectedSubject,
          predicate,
          selectedPredicate,
          object,
          selectedObject,
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
  }, [currentAnnotation, popover, setLoadingState])

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

      toast.success('Annotation deleted!')
    } catch (error) {
      toast.error(`Failed to delete annotation: ${(error as Error)?.message || 'Unknown error'}`)
    } finally {
      setLoadingState('deletingAnnotation', false)
    }
  }, [currentAnnotation, setLoadingState])

  const createAnnotationComponent = useCallback((type: EntityType): DocumentAnnotationComponent | null => {
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
      annotationTag: type,
      elementIndex: currentElementIndex,
    }
  }, [selection, combinedElements])

  const handleMentionAssociation = useCallback((type: EntityType) => {
    if (!popover.popoverState.annotation || !popover.popoverState.componentId)
      return

    const { annotation, componentId } = popover.popoverState
    const componentMapping: Record<string, DocumentAnnotationComponent | undefined> = {
      [annotation.subjectId]: annotation.subject,
      [annotation.predicateId]: annotation.predicate,
      [annotation.objectId]: annotation.object,
    }

    const component = componentMapping[componentId]
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

  const handleSelectionMentionAssociation = useCallback((type: EntityType) => {
    if (popover.popoverState.annotation && popover.popoverState.componentId) {
      handleMentionAssociation(type)
    } else {
      addToCurrentAnnotation(type)
    }
    popover.hidePopover()
  }, [handleMentionAssociation, addToCurrentAnnotation, popover])

  const handleCloneAnnotation = useCallback(() => {
    if (!popover.popoverState.annotation) {
      return
    }

    const annotation = popover.popoverState.annotation

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
      subject: cloneComponent(annotation.subject),
      predicate: cloneComponent(annotation.predicate),
      object: cloneComponent(annotation.object),
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

    // Sub-hooks
    selection,
    popover,
  } as const
}
