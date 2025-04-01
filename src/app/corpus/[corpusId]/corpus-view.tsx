'use client'
import type { DocumentMetadata } from '@/actions/corpusActions'
import type { AnnotationComponent, Corpus, Document } from '@/db/schema'
import type { Offset } from '@/lib/utils'
import { addAnnotation, deleteAnnotation, getAnnotationById, updateAnnotation } from '@/actions/corpusActions'
import { EntitySelector } from '@/components/entity-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn, selectionIsBackwards, selectionIsEmpty } from '@/lib/utils'
import { ArrowLeftRightIcon, BoxIcon, EditIcon, LinkIcon, Loader2Icon, SaveIcon, Trash2Icon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import wtf from 'wtf_wikipedia'
import CombinedElement from './combined-element'

export type TextOrTableElement = {
  elementIndex: number
  type: 'text' | 'table'
  startOffset: number
  endOffset: number
  value: string | string[][]
  data: any
}

export type EntityType = 'subject' | 'predicate' | 'object'

export type EntityDatatype = 'integer' | 'decimal' | 'boolean' | 'string' | 'date' | 'time' | 'datetime' | 'year' | 'month' | 'day' | 'url'

export type Entity = {
  label: string
  value: string
  custom: boolean
  datatype: EntityDatatype | null
}

export type DocumentAnnotationComponent = {
  id: string
  entityLabel: string | null
  entityValue: string | null
  entityCustom: boolean | null
  entityDatatype: EntityDatatype | null
  annotationStart: number
  annotationEnd: number
  annotationRow: number | null
  annotationCell: number | null
  annotationValue: string
  annotationType: 'text' | 'table'
  annotationTag: string
  elementIndex: number
}

export type DocumentAnnotation = {
  id: string
  subjectId: string
  predicateId: string
  objectId: string
  annotationId: string | null
  documentId: string | null
  corpusId: string | null
  subject: DocumentAnnotationComponent
  predicate: DocumentAnnotationComponent
  object: DocumentAnnotationComponent
}

export type DocumentElement = {
  components: DocumentAnnotationComponent[]
  value: string | string[][]
}

export type DocumentData = {
  _source: {
    identificationMetadata: {
      id: string
      versionDate: string
      hash: string
      title?: string
      wikidata?: string
      url?: string | string[]
    }
    extractionMetadata: {
      technology: string | null
      texts: { startOffset?: number, endOffset?: number, value: string }[]
      tables: { startOffset?: number, endOffset?: number, tableData: string[][] }[]
    }[]
  }
}

type PopoverState = {
  top: number
  left: number
  annotation: DocumentAnnotation | null
  componentId: string | undefined | null
  visible: boolean
}

export default function CorpusView({ corpus, documents, document, annotations }: {
  corpus: Corpus
  documents: DocumentMetadata[]
  document?: Document
  annotations?: DocumentAnnotation[]
}) {
  const [documentAnnotations, setDocumentAnnotations] = useState<DocumentAnnotation[]>(annotations || [])
  const [popoverState, setPopoverState] = useState<PopoverState>({
    top: 0,
    left: 0,
    annotation: null,
    componentId: null,
    visible: false,
  })
  const [documentElements, setDocumentElements] = useState<DocumentElement[]>([])
  const [selectedOffset, setSelectedOffset] = useState({ start: 0, end: 0 })
  const [currentElementIndex, setCurrentElementIndex] = useState<number | null>(null)
  const [combinedElements, setCombinedElements] = useState<TextOrTableElement[]>([])
  const [tableSelection, setTableSelection] = useState<{ rowIndex: number, cellIndex: number } | null>(null)
  const [documentData] = useState<DocumentData | undefined>(document?.raw as (DocumentData | undefined))
  const [annotationFormLoading, setAnnotationFormLoading] = useState(false)
  const [isDeletingAnnotation, setIsDeletingAnnotation] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<{
    id?: string
    subject?: DocumentAnnotationComponent
    predicate?: DocumentAnnotationComponent
    object?: DocumentAnnotationComponent
  } | null>(null)
  const [showAnnotations, setShowAnnotations] = useState(true)

  const handleTextSelection = (index: number) => {
    setCurrentElementIndex(index)

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0)
      return

    const range = selection.getRangeAt(0)
    if (range.collapsed)
      return

    // Get the start and end nodes
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer
    const endNode = range.endContainer.nodeType === Node.TEXT_NODE
      ? range.endContainer.parentElement
      : range.endContainer

    // Get the start and end offsets from the closest elements with data attributes
    const startElement = startNode instanceof Element
      ? startNode.closest('[data-start]')
      : startNode?.parentElement?.closest('[data-start]')
    const endElement = endNode instanceof Element
      ? endNode.closest('[data-start]')
      : endNode?.parentElement?.closest('[data-start]')

    if (!startElement || !endElement)
      return

    // Calculate the absolute offsets
    const start = Number.parseInt(startElement.getAttribute('data-start') || '0', 10) + range.startOffset
    const end = Number.parseInt(endElement.getAttribute('data-start') || '0', 10) + range.endOffset

    // Handle backwards selection
    const finalStart = Math.min(start, end)
    const finalEnd = Math.max(start, end)

    setSelectedOffset({ start: finalStart, end: finalEnd })

    const rect = range.getBoundingClientRect()
    setPopoverState({
      top: rect.top + window.scrollY - 80,
      left: rect.left + window.scrollX,
      annotation: null,
      componentId: null,
      visible: true,
    })
  }

  const handleTableSelection = (index: number, rowIndex: number, cellIndex: number) => {
    setCurrentElementIndex(index)
    setTableSelection({ rowIndex, cellIndex })

    const selection = window.getSelection()

    if (!selection || selectionIsEmpty(selection))
      return

    const anchorParent = selection.anchorNode?.parentElement
    const focusParent = selection.focusNode?.parentElement

    if (anchorParent !== focusParent)
      return // Prevent selecting over multiple parents

    let start = Number.parseInt(anchorParent?.getAttribute('data-start') || '0', 10) + selection.anchorOffset
    let end = Number.parseInt(focusParent?.getAttribute('data-start') || '0', 10) + selection.focusOffset

    if (selectionIsBackwards(selection)) {
      [start, end] = [end, start]
    }

    setSelectedOffset({ start, end })

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setPopoverState(prev => ({
      ...prev,
      top: rect.top + window.scrollY - 80,
      left: rect.left + window.scrollX,
      annotation: null,
      visible: true,
    }))
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
            entityDatatype: null,
            annotationStart: component.annotationStart,
            annotationEnd: component.annotationEnd,
            annotationRow: component.annotationRow,
            annotationCell: component.annotationCell,
            annotationValue: component.annotationValue,
            annotationType: component.annotationType,
            annotationTag: type,
            elementIndex: currentElementIndex,
          },
        }))
        setPopoverState(prev => ({ ...prev, visible: false }))
      }
      return
    }

    if (currentElementIndex === null)
      return // Ensure a text block is selected

    const currentElementType = combinedElements[currentElementIndex].type
    if (currentElementType === 'table' && !tableSelection)
      return // Ensure a cell is selected

    let value = ''
    if (currentElementType === 'text') {
      value = documentElements[currentElementIndex].value as string
    } else if (currentElementType === 'table' && tableSelection) {
      value = (documentElements[currentElementIndex].value)[tableSelection.rowIndex][tableSelection.cellIndex]
    }

    const newComponent: AnnotationComponent = {
      id: uuidv4(),
      entityLabel: null,
      entityValue: null,
      entityCustom: null,
      entityDatatype: null,
      annotationStart: selectedOffset.start,
      annotationEnd: selectedOffset.end,
      annotationRow: tableSelection?.rowIndex ?? null,
      annotationCell: tableSelection?.cellIndex ?? null,
      annotationValue: value.slice(selectedOffset.start, selectedOffset.end),
      annotationType: currentElementType,
      annotationTag: type,
      elementIndex: currentElementIndex,
    }

    setCurrentAnnotation(prev => ({
      ...prev,
      [type]: newComponent,
    }))

    // Reset selection and popover
    setPopoverState(prev => ({ ...prev, visible: false }))

    // Clear selection
    window.getSelection()?.removeAllRanges()
  }, [currentElementIndex, popoverState, combinedElements, tableSelection, documentElements, selectedOffset])

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

  const onClickCreateAnnotation = async () => {
    if (!document || !currentAnnotation) {
      return
    }

    const { subject, predicate, object } = currentAnnotation

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
        datatype: subject.entityDatatype || null,
      }
      const selectedPredicate: Entity = {
        label: predicate.entityLabel || '',
        value: predicate.entityValue || '',
        custom: predicate.entityCustom || false,
        datatype: predicate.entityDatatype || null,
      }
      const selectedObject: Entity = {
        label: object.entityLabel || '',
        value: object.entityValue || '',
        custom: object.entityCustom || false,
        datatype: object.entityDatatype || null,
      }
      if (currentAnnotation.id) {
        await updateAnnotation(currentAnnotation.id, subject, selectedSubject, predicate, selectedPredicate, object, selectedObject)
        const updatedAnnotation = await getAnnotationById(currentAnnotation.id)
        setDocumentAnnotations(prev => prev.map(ann => (ann.id === currentAnnotation.id ? updatedAnnotation : ann)))
        setCurrentAnnotation(null)
        toast.success('Annotation updated!')
      } else {
        const annotationId = await addAnnotation(document.id, subject, selectedSubject, predicate, selectedPredicate, object, selectedObject)
        const newAnnotation = await getAnnotationById(annotationId)
        setDocumentAnnotations(prev => [
          ...prev,
          newAnnotation,
        ])
        toast.success('Annotation created!')
      }
    } catch (error: any) {
      toast.error(`Failed to save annotation: ${error?.message || 'Something went wrong'}`)
    } finally {
      // Remove all annotations
      resetAnnotations()
      // Reset selection and popover
      setPopoverState(prev => ({ ...prev, visible: false }))
      setCurrentAnnotation(null)

      setAnnotationFormLoading(false)
    }
  }

  const onClickDeleteAnnotation = async () => {
    if (currentAnnotation?.id) {
      setIsDeletingAnnotation(true)
      try {
        await deleteAnnotation(currentAnnotation.id)
        setDocumentAnnotations(prev => prev.filter(ann => ann.id !== currentAnnotation.id))
        resetAnnotations()
        setCurrentAnnotation(null)
        toast.success('Annotation deleted!')
      } catch (error: any) {
        toast.error(`Failed to delete annotation: ${error?.message || 'Something went wrong'}`)
      } finally {
        setIsDeletingAnnotation(false)
      }
    }
  }

  const handleSplitClick = ({ componentId }: Offset) => {
    const ann = documentAnnotations.find(ann => ann.subjectId === componentId || ann.predicateId === componentId || ann.objectId === componentId)
    if (!ann) {
      return
    }
    const selection = window.getSelection()
    if (!selection)
      return
    const rect = selection.getRangeAt(0).getClientRects()[0]

    setPopoverState({
      top: rect.top + window.scrollY - 80,
      left: rect.left + window.scrollX,
      visible: true,
      annotation: ann,
      componentId,
    })
  }

  useEffect(() => {
    if (!document || !documentData?._source)
      return
    const els = [
      ...documentData._source.extractionMetadata[0].texts.map((text: any) => ({
        type: 'text' as const,
        startOffset: text.startOffset,
        endOffset: text.endOffset,
        value: documentData._source.extractionMetadata[0].technology === 'WikitextExtractor' ? wtf(text.value).text() : text.value,
        data: {
          ...text,
        },
      })),
      ...documentData._source.extractionMetadata[0].tables.map((table: any) => ({
        type: 'table' as const,
        startOffset: table.startOffset,
        endOffset: table.endOffset,
        value: table.tableData,
        data: {
          ...table,
        },
      })),
    ].sort((a, b) => a.startOffset - b.startOffset).map((el, index) => ({ ...el, elementIndex: index }))

    setCombinedElements(els)
  }, [document, documentData])

  useEffect(() => {
    resetAnnotations()
  }, [combinedElements, resetAnnotations])

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
            // Edit the annotation
            if (popoverState.annotation) {
              setCurrentAnnotation(popoverState.annotation)
              setPopoverState(prev => ({ ...prev, visible: false }))
            }
            break
          default:
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetAnnotations, handleMentionAssociation, popoverState.visible, popoverState.annotation])

  const subjectTag = currentAnnotation?.subject
  const predicateTag = currentAnnotation?.predicate
  const objectTag = currentAnnotation?.object

  const hasAnyTags = Boolean(subjectTag || predicateTag || objectTag)
  const hasAllTags = Boolean(subjectTag && predicateTag && objectTag)

  return (
    <div className="flex">
      {documentData && (
        <aside className="fixed hidden h-screen w-[280px] flex-col bg-gray-100 lg:flex">
          <div className="mt-6 flex justify-center gap-4  px-8">
            <Link href="/">
              <Button variant="outline" className="px-6 py-2">Home</Button>
            </Link>
            <Link href={`/corpus/${corpus.id}`}>
              <Button variant="outline" className="px-6 py-2">Back to Corpus</Button>
            </Link>
          </div>
          <h2 className="mb-4 mt-8 px-8 text-xl font-bold">
            {documents.length}
            {' '}
            document
            {documents.length === 1 ? '' : 's'}
          </h2>
          <ScrollArea>
            <ul>
              {documents.map((doc, i) => (
                <li
                  key={doc.id}
                  className={cn('mb-3 px-8', doc.id === document?.id && 'font-semibold text-blue-500')}
                >
                  <Link href={`/document/${doc.id}`} className="flex flex-col gap-0">
                    <span
                      className="max-w-[220px] truncate break-all"
                      title={doc.title}
                    >
                      {i + 1}
                      .
                      {' '}
                      {doc.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      {doc.annotationsCount}
                      {' '}
                      annotation
                      {doc.annotationsCount === 1 ? '' : 's'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </aside>
      )}
      <main className={cn('ml-0 min-w-0 flex-1 lg:ml-[280px]', documentAnnotations.length > 0 && 'md:mr-[280px]')}>
        <div className="container mx-auto p-6 lg:px-12">
          <h1 className="mb-6 text-3xl font-bold">
            Corpus:
            {' '}
            {corpus.title}
          </h1>
          {documentData
          && (
            <>
              <div className="mb-4">
                <h2 className="text-2xl font-bold">
                  {documentData._source.identificationMetadata.title}
                </h2>
                {documentData._source.identificationMetadata.versionDate && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Version Date:</strong>
                    {' '}
                    {documentData._source.identificationMetadata.versionDate}
                  </p>
                )}
                {documentData._source.identificationMetadata.wikidata && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Wikidata: </strong>
                    {' '}
                    <Link href={`https://www.wikidata.org/wiki/${documentData._source.identificationMetadata.wikidata}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">
                      {documentData._source.identificationMetadata.wikidata}
                    </Link>
                  </p>
                )}
                {documentData._source.identificationMetadata.url && (
                  <p className="text-sm text-muted-foreground">
                    <strong>URL: </strong>
                    {Array.isArray(documentData._source.identificationMetadata.url)
                      ? (
                          documentData._source.identificationMetadata.url.map((url, i) => (
                            <React.Fragment key={url}>
                              {i > 0 && ', '}
                              <Link href={url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">
                                {url}
                              </Link>
                            </React.Fragment>
                          ))
                        )
                      : (
                          <Link href={documentData._source.identificationMetadata.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">
                            {documentData._source.identificationMetadata.url}
                          </Link>
                        )}
                  </p>
                )}
              </div>
              <Card className="mb-6">
                <CardHeader>
                  <CardDescription>Select text or table cells to start annotating</CardDescription>
                </CardHeader>
                <CardContent>
                  {combinedElements.map(element => (
                    <CombinedElement
                      key={`element-${element.elementIndex}`}
                      {...element}
                      handleSplitClick={handleSplitClick}
                      handleTableSelection={handleTableSelection}
                      handleTextSelection={handleTextSelection}
                      documentElements={documentElements}
                    />
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <div
            className={cn(
              'fixed bottom-0 left-1/2 z-10 w-full max-w-screen-md -translate-x-1/2 transition-transform duration-300 md:w-3/4 lg:w-2/3',
              hasAnyTags ? 'translate-y-0' : 'translate-y-full',
            )}
          >
            <Card className="mb-6 rounded-none sm:rounded-xl">
              <CardHeader className="flex flex-row pb-4">
                <div>
                  <CardTitle>{currentAnnotation?.id ? 'Editing annotation' : 'Finalize your new annotation'}</CardTitle>
                  <CardDescription>Select entities for each subject, predicate, and object.</CardDescription>
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
                            <Button variant="destructive" onClick={onClickDeleteAnnotation} disabled={isDeletingAnnotation}>
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
                      <Button className="bg-green-600 text-green-50 hover:bg-green-700 focus-visible:ring-green-500" onClick={onClickCreateAnnotation} disabled={!hasAllTags || annotationFormLoading || isDeletingAnnotation}>
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
                        onClick={() => {
                          setCurrentAnnotation(null)
                        }}
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
                          onClick={() => setCurrentAnnotation(prev => ({ ...prev, subject: undefined }))}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <EntitySelector
                      type="subject"
                      value={
                        currentAnnotation?.subject?.entityValue
                          ? {
                              label: currentAnnotation.subject.entityLabel || '',
                              value: currentAnnotation.subject.entityValue,
                              custom: currentAnnotation.subject.entityCustom || false,
                              datatype: currentAnnotation.subject.entityDatatype || null,
                            }
                          : null
                      }
                      onValueChange={(newValue) => {
                        setCurrentAnnotation((prev) => {
                          if (!prev?.subject)
                            return prev
                          return {
                            ...prev,
                            subject: {
                              ...prev.subject,
                              entityLabel: newValue?.label || null,
                              entityValue: newValue?.value || null,
                              entityCustom: newValue?.custom || false,
                              entityDatatype: newValue?.datatype || null,
                            },
                          }
                        })
                      }}
                      text={currentAnnotation?.subject?.annotationValue ?? ''}
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
                          onClick={() => setCurrentAnnotation(prev => ({ ...prev, predicate: undefined }))}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex min-w-0 items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <EntitySelector
                          type="predicate"
                          value={
                            currentAnnotation?.predicate?.entityValue
                              ? {
                                  label: currentAnnotation.predicate.entityLabel || '',
                                  value: currentAnnotation.predicate.entityValue,
                                  custom: currentAnnotation.predicate.entityCustom || false,
                                  datatype: currentAnnotation.predicate.entityDatatype || null,
                                }
                              : null
                          }
                          onValueChange={(newValue) => {
                            setCurrentAnnotation((prev) => {
                              if (!prev?.predicate)
                                return prev
                              return {
                                ...prev,
                                predicate: {
                                  ...prev.predicate,
                                  entityLabel: newValue?.label || null,
                                  entityValue: newValue?.value || null,
                                  entityCustom: newValue?.custom || false,
                                  entityDatatype: newValue?.datatype || null,
                                },
                              }
                            })
                          }}
                          text={currentAnnotation?.predicate?.annotationValue ?? ''}
                        />
                      </div>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="px-2"
                            onClick={() => {
                              setCurrentAnnotation((prev) => {
                                if (!prev?.subject || !prev?.object)
                                  return prev
                                return {
                                  ...prev,
                                  subject: prev.object,
                                  object: prev.subject,
                                }
                              })
                            }}
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
                          onClick={() => setCurrentAnnotation(prev => ({ ...prev, object: undefined }))}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <EntitySelector
                      type="object"
                      value={
                        currentAnnotation?.object?.entityValue
                          ? {
                              label: currentAnnotation.object.entityLabel || '',
                              value: currentAnnotation.object.entityValue,
                              custom: currentAnnotation.object.entityCustom || false,
                              datatype: currentAnnotation.object.entityDatatype || null,
                            }
                          : null
                      }
                      onValueChange={(newValue) => {
                        setCurrentAnnotation((prev) => {
                          if (!prev?.object)
                            return prev
                          return {
                            ...prev,
                            object: {
                              ...prev.object,
                              entityLabel: newValue?.label || null,
                              entityValue: newValue?.value || null,
                              entityCustom: newValue?.custom || false,
                              entityDatatype: newValue?.datatype || null,
                            },
                          }
                        })
                      }}
                      text={currentAnnotation?.object?.annotationValue ?? ''}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popover for Selection */}
          {popoverState.visible && (
            <Popover
              open={popoverState.visible}
              onOpenChange={() => setPopoverState(prev => ({ ...prev, visible: false }))}
            >
              <PopoverTrigger asChild>
                <div
                  style={{
                    position: 'absolute',
                    top: popoverState.top,
                    left: popoverState.left,
                    zIndex: 1000,
                  }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto">
                <div className="flex gap-2">
                  {popoverState.annotation && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentAnnotation(popoverState.annotation)
                        setPopoverState(prev => ({ ...prev, visible: false }))
                      }}
                    >
                      <EditIcon />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-orange-400 focus-visible:ring-orange-500"
                    onClick={() => handleMentionAssociation('subject')}
                  >
                    <UserIcon />
                    {' '}
                    Subject
                  </Button>
                  <Button
                    variant="outline"
                    className="border-blue-400 focus-visible:ring-blue-500"
                    onClick={() => handleMentionAssociation('predicate')}
                  >
                    <LinkIcon />
                    {' '}
                    Predicate
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-400 focus-visible:ring-green-500"
                    onClick={() => handleMentionAssociation('object')}
                  >
                    <BoxIcon />
                    {' '}
                    Object
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </main>
      {documentAnnotations.length > 0 && (
        <aside className="fixed right-0 hidden h-full w-[280px] bg-gray-100 md:block">
          <div className="flex h-full flex-col p-6">
            <h2 className="mb-4 text-xl font-bold">Annotations</h2>
            <div className="mb-4 flex items-center gap-1">
              <Checkbox
                id="show-annotations"
                checked={showAnnotations}
                onCheckedChange={checked => setShowAnnotations(checked === true)}
              />
              <label
                htmlFor="show-annotations"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Highlight annotations in doc
              </label>
            </div>
            <ScrollArea>
              <ul className="space-y-3 pb-4">
                {documentAnnotations.map(ann => (
                  <li key={ann.id} className="mb-3">
                    <button
                      type="button"
                      className="w-full rounded-md bg-white p-2 text-left shadow hover:bg-gray-50"
                      onClick={
                        () => {
                          if (ann.id === currentAnnotation?.id) {
                            setCurrentAnnotation(null)
                            return
                          }

                          setCurrentAnnotation(ann)

                          const element = window.document.getElementById(`element-${ann.subject.elementIndex}`)
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }
                        }
                      }
                    >
                      <span className="font-semibold text-orange-500">{ann.subject.annotationValue}</span>
                      {' '}
                      &rarr;
                      {' '}
                      <span className="font-semibold text-blue-500">{ann.predicate.annotationValue}</span>
                      {' '}
                      &rarr;
                      {' '}
                      <span className="font-semibold text-green-500">{ann.object.annotationValue}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </aside>
      )}
    </div>
  )
}
