import type { CurrentAnnotation, DocumentAnnotation, DocumentAnnotationComponent, DocumentElement, Entity, EntityType, TextOrTableElement } from '@/types/types'
import { addAnnotation, deleteAnnotation, getAnnotationById, updateAnnotation } from '@/actions/annotation/annotationActions'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

export type PopoverState = {
  top: number
  left: number
  annotation: DocumentAnnotation | null
  componentId: string | undefined | null
  visible: boolean
}

export function useAnnotationState(
  initialAnnotations: DocumentAnnotation[] = [],
  combinedElements: TextOrTableElement[],
  showAnnotations: boolean,
) {
  const [documentAnnotations, setDocumentAnnotations] = useState<DocumentAnnotation[]>(initialAnnotations)
  const [currentAnnotation, setCurrentAnnotation] = useState<CurrentAnnotation | null>(null)
  const [annotationFormLoading, setAnnotationFormLoading] = useState(false)
  const [isDeletingAnnotation, setIsDeletingAnnotation] = useState(false)
  const [popoverState, setPopoverState] = useState<PopoverState>({
    top: 0,
    left: 0,
    annotation: null,
    componentId: null,
    visible: false,
  })
  const [documentElements, setDocumentElements] = useState<DocumentElement[]>([])

  // Update annotations when props change
  useEffect(() => {
    setDocumentAnnotations(initialAnnotations)
  }, [initialAnnotations])

  const resetAnnotations = useCallback(() => {
    setDocumentElements(combinedElements.map((el) => {
      const components = documentAnnotations.flatMap((ann) => {
        if (!showAnnotations && ann.id !== currentAnnotation?.id)
          return []
        const elements = []
        const annotation = ann.id === currentAnnotation?.id ? currentAnnotation : ann
        if (annotation.subject?.elementIndex === el.elementIndex)
          elements.push(annotation.subject)
        if (annotation.predicate?.elementIndex === el.elementIndex)
          elements.push(annotation.predicate)
        if (annotation.object?.elementIndex === el.elementIndex)
          elements.push(annotation.object)
        return elements
      })

      if (currentAnnotation) {
        if (currentAnnotation.subject?.elementIndex === el.elementIndex && !components.includes(currentAnnotation.subject))
          components.push(currentAnnotation.subject)
        if (currentAnnotation.predicate?.elementIndex === el.elementIndex && !components.includes(currentAnnotation.predicate))
          components.push(currentAnnotation.predicate)
        if (currentAnnotation.object?.elementIndex === el.elementIndex && !components.includes(currentAnnotation.object))
          components.push(currentAnnotation.object)
      }

      return { ...el, components }
    }))
  }, [combinedElements, documentAnnotations, currentAnnotation, showAnnotations])

  const createAnnotation = async (
    documentId: string,
    subject: DocumentAnnotationComponent,
    predicate: DocumentAnnotationComponent,
    object: DocumentAnnotationComponent,
  ) => {
    if (!subject || !predicate || !object) {
      toast.error('Please select entities for each subject, predicate, and object.')
      return
    }

    setAnnotationFormLoading(true)

    try {
      const selectedSubject: Entity = {
        label: subject.entityLabel || '',
        value: subject.entityValue || '',
        custom: subject.entityCustom || false,
        customId: subject.entityCustomId || null,
        datatype: subject.entityDatatype || null,
        type: 'subject',
      }
      const selectedPredicate: Entity = {
        label: predicate.entityLabel || '',
        value: predicate.entityValue || '',
        custom: predicate.entityCustom || false,
        customId: predicate.entityCustomId || null,
        datatype: predicate.entityDatatype || null,
        type: 'predicate',
      }
      const selectedObject: Entity = {
        label: object.entityLabel || '',
        value: object.entityValue || '',
        custom: object.entityCustom || false,
        customId: object.entityCustomId || null,
        datatype: object.entityDatatype || null,
        type: 'object',
      }

      if (currentAnnotation?.id) {
        await updateAnnotation(currentAnnotation.id, subject, selectedSubject, predicate, selectedPredicate, object, selectedObject)
        const updatedAnnotation = await getAnnotationById(currentAnnotation.id)
        setDocumentAnnotations(prev => prev.map(ann => (ann.id === currentAnnotation.id ? updatedAnnotation : ann)))
        setCurrentAnnotation(null)
        toast.success('Annotation updated!')
      } else {
        const annotationId = await addAnnotation(documentId, subject, selectedSubject, predicate, selectedPredicate, object, selectedObject)
        const newAnnotation = await getAnnotationById(annotationId)
        setDocumentAnnotations(prev => [...prev, newAnnotation])
        toast.success('Annotation created!')
      }
    } catch (error: any) {
      toast.error(`Failed to save annotation: ${error?.message || 'Something went wrong'}`)
    } finally {
      resetAnnotations()
      setPopoverState(prev => ({ ...prev, visible: false }))
      setCurrentAnnotation(null)
      setAnnotationFormLoading(false)
    }
  }

  const deleteAnnotationById = async (annotationId: string) => {
    setIsDeletingAnnotation(true)
    try {
      await deleteAnnotation(annotationId)
      setDocumentAnnotations(prev => prev.filter(ann => ann.id !== annotationId))
      resetAnnotations()
      setCurrentAnnotation(null)
      toast.success('Annotation deleted!')
    } catch (error: any) {
      toast.error(`Failed to delete annotation: ${error?.message || 'Something went wrong'}`)
    } finally {
      setIsDeletingAnnotation(false)
    }
  }

  const handleMentionAssociation = useCallback((type: EntityType) => {
    if (popoverState.annotation && popoverState.componentId) {
      const { annotation, componentId } = popoverState
      const componentMapping = {
        [annotation.subjectId]: annotation.subject,
        [annotation.predicateId]: annotation.predicate,
        [annotation.objectId]: annotation.object,
      }
      const component = componentMapping[componentId]
      if (component) {
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
        setPopoverState(prev => ({ ...prev, visible: false }))
      }
    }
  }, [popoverState])

  // Keyboard shortcuts
  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setCurrentAnnotation(null)
      }

      if (popoverState.visible && ['s', 'p', 'o', 'e'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        switch (e.key.toLowerCase()) {
          case 's':
            handleMentionAssociation('subject')
            break
          case 'p':
            handleMentionAssociation('predicate')
            break
          case 'o':
            handleMentionAssociation('object')
            break
          case 'e':
            if (popoverState.annotation) {
              setCurrentAnnotation(popoverState.annotation)
              setPopoverState(prev => ({ ...prev, visible: false }))
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetAnnotations, handleMentionAssociation, popoverState.visible, popoverState.annotation])

  useEffect(() => {
    resetAnnotations()
  }, [combinedElements, resetAnnotations])

  return {
    documentAnnotations,
    currentAnnotation,
    setCurrentAnnotation,
    annotationFormLoading,
    isDeletingAnnotation,
    popoverState,
    setPopoverState,
    documentElements,
    createAnnotation,
    deleteAnnotationById,
    handleMentionAssociation,
    resetAnnotations,
  }
}
