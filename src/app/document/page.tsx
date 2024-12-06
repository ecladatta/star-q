'use client'
import type { Offset } from '@/lib/utils'
import { EntitySelector } from '@/components/entity-selector'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn, selectionIsBackwards, selectionIsEmpty } from '@/lib/utils'
import { BoxIcon, LinkIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
// @ts-expect-error - no types available
import wtf from 'wtf_wikipedia'
import CombinedElement from './combined-element'
import sampleTable from './sample_table.json'

export type TextOrTableElement = {
  elementIndex: number
  type: 'text' | 'table'
  startOffset: number
  endOffset: number
  value: string | string[][]
  data: any
}

export type Annotation = {
  value: string
  offset: Offset
  type: string
  elementIndex: number
  tag: 'subject' | 'predicate' | 'object'
}

export type DocumentAnnotation = {
  id: string
  subject: { id: string, annotation: Annotation, entity: { label: string, value: string } | null }
  predicate: { id: string, annotation: Annotation, entity: { label: string, value: string } | null }
  object: { id: string, annotation: Annotation, entity: { label: string, value: string } | null }
}

export type DocumentElement = {
  annotations: Annotation[]
  value: string | string[][]
}

export default function DocumentAnnotationPage() {
  const [documentAnnotations, setDocumentAnnotations] = useState<DocumentAnnotation[]>([])
  const [popoverPosition, setPopoverPosition] = useState({
    top: 0,
    left: 0,
    visible: false,
  })

  const [documentElements, setDocumentElements] = useState<DocumentElement[]>([])
  const [selectedOffset, setSelectedOffset] = useState({ start: 0, end: 0 })
  const [currentElementIndex, setCurrentElementIndex] = useState<number | null>(null)
  const [combinedElements, setCombinedElements] = useState<TextOrTableElement[]>([])
  const [tableSelection, setTableSelection] = useState<{ rowIndex: number, cellIndex: number } | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<{ label: string, value: string } | null>(null)
  const [selectedPredicate, setSelectedPredicate] = useState<{ label: string, value: string } | null>(null)
  const [selectedObject, setSelectedObject] = useState<{ label: string, value: string } | null>(null)
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null)

  const handleTextSelection = (index: number) => {
    setCurrentElementIndex(index)

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
    setPopoverPosition({
      top: rect.top + window.scrollY - 80,
      left: rect.left + window.scrollX,
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
    setPopoverPosition({
      top: rect.top + window.scrollY - 80,
      left: rect.left + window.scrollX,
      visible: true,
    })
  }

  const handleMentionAssociation = (type: 'subject' | 'predicate' | 'object') => {
    if (currentElementIndex === null)
      return // Ensure a text block is selected

    const currentElementType = combinedElements[currentElementIndex].type
    if (currentElementType === 'table' && !tableSelection)
      return // Ensure a cell is selected

    setDocumentElements((prev) => {
      const updatedAnnotations = [...prev]
      const currentAnnotations = updatedAnnotations[currentElementIndex].annotations

      let value = ''
      if (currentElementType === 'text') {
        value = updatedAnnotations[currentElementIndex].value as string
      } else if (currentElementType === 'table' && tableSelection) {
        value = (updatedAnnotations[currentElementIndex].value)[tableSelection.rowIndex][tableSelection.cellIndex]
      }

      // Check for overlaps
      const newAnnotation: Annotation = {
        offset: selectedOffset,
        value: value.slice(selectedOffset.start, selectedOffset.end),
        type: currentElementType,
        tag: type,
        elementIndex: currentElementIndex,
      }
      if (currentElementType === 'table' && tableSelection) {
        newAnnotation.offset.row = tableSelection.rowIndex
        newAnnotation.offset.cell = tableSelection.cellIndex
      }
      const hasOverlap = currentAnnotations.some((annotation) => {
        if (currentElementType === 'text') {
          return newAnnotation.offset.start < annotation.offset.end && newAnnotation.offset.end > annotation.offset.start
        } else if (currentElementType === 'table' && tableSelection) {
          return (
            newAnnotation.offset.row === annotation.offset.row
            && newAnnotation.offset.cell === annotation.offset.cell
            && newAnnotation.offset.start < annotation.offset.end
            && newAnnotation.offset.end > annotation.offset.start
          )
        }
        return false
      })

      if (!hasOverlap) {
        // No overlap, add the new annotation
        updatedAnnotations[currentElementIndex] = {
          ...updatedAnnotations[currentElementIndex],
          annotations: [...currentAnnotations, newAnnotation],
        }
      } else {
        // Remove overlapping annotations and add the new annotation
        updatedAnnotations[currentElementIndex] = {
          ...updatedAnnotations[currentElementIndex],
          annotations: currentAnnotations.filter(annotation =>
            !(newAnnotation.offset.start < annotation.offset.end && newAnnotation.offset.end > annotation.offset.start),
          ).concat(newAnnotation),
        }
      }

      return updatedAnnotations
    })

    // Reset selection and popover
    setPopoverPosition(prev => ({ ...prev, visible: false }))
  }

  const resetAnnotations = useCallback(() => {
    setDocumentElements(combinedElements.map(el => ({ annotations: [], ...el })))
  }, [combinedElements])

  const createAnnotation = () => {
    // Save the annotation
    const subjectTag = documentElements.find(doc => doc.annotations.some(annotation => annotation.tag === 'subject'))?.annotations.find(annotation => annotation.tag === 'subject')
    const predicateTag = documentElements.find(doc => doc.annotations.some(annotation => annotation.tag === 'predicate'))?.annotations.find(annotation => annotation.tag === 'predicate')
    const objectTag = documentElements.find(doc => doc.annotations.some(annotation => annotation.tag === 'object'))?.annotations.find(annotation => annotation.tag === 'object')

    if (!subjectTag || !predicateTag || !objectTag) {
      toast.error('Please select entities for each subject, predicate, and object.')
      return
    }

    // @TODO: Send the annotation to the server
    if (editingAnnotation) {
      setDocumentAnnotations(prev => prev.map((ann) => {
        if (ann.id === editingAnnotation) {
          return {
            ...ann,
            subject: {
              ...ann.subject,
              annotation: subjectTag,
              entity: selectedSubject,
            },
            predicate: {
              ...ann.predicate,
              annotation: predicateTag,
              entity: selectedPredicate,
            },
            object: {
              ...ann.object,
              annotation: objectTag,
              entity: selectedObject,
            },
          }
        }
        return ann
      }))
      setEditingAnnotation(null)
      toast.success('Annotation updated!')
    } else {
      setDocumentAnnotations(prev => [
        ...prev,
        {
          id: uuidv4(),
          subject: {
            id: uuidv4(),
            annotation: subjectTag,
            entity: selectedSubject,
          },
          predicate: {
            id: uuidv4(),
            annotation: predicateTag,
            entity: selectedPredicate,
          },
          object: {
            id: uuidv4(),
            annotation: objectTag,
            entity: selectedObject,
          },
        },
      ])

      toast.success('Annotation created!')
    }

    // Remove all annotations
    resetAnnotations()
    // Reset selection and popover
    setPopoverPosition(prev => ({ ...prev, visible: false }))
  }

  const handleSplitClick = (textIndex: number, { start, end }: { start: number, end: number }) => {
    setDocumentElements((prev) => {
      const updatedAnnotations = [...prev]
      const splitIndex = updatedAnnotations[textIndex].annotations.findIndex(s => s.offset.start === start && s.offset.end === end)
      if (splitIndex >= 0) {
        updatedAnnotations[textIndex] = {
          ...updatedAnnotations[textIndex],
          annotations: [
            ...updatedAnnotations[textIndex].annotations.slice(0, splitIndex),
            ...updatedAnnotations[textIndex].annotations.slice(splitIndex + 1),
          ],
        }
      }
      return updatedAnnotations
    })
  }

  useEffect(() => {
    const els = [
      ...sampleTable._source.extractionMetadata[0].texts.map(text => ({
        type: 'text' as const,
        startOffset: text.startOffset,
        endOffset: text.endOffset,
        value: wtf(text.value).text(),
        data: {
          ...text,
        },
      })),
      ...sampleTable._source.extractionMetadata[0].tables.map(table => ({
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
  }, [])

  useEffect(() => {
    resetAnnotations()
  }, [resetAnnotations])

  const hasAllTags = ['subject', 'predicate', 'object'].every(tag => documentElements.some(doc => doc.annotations.some(annotation => annotation.tag === tag)))
  const hasAnyTags = documentElements.some(doc => doc.annotations.some(annotation => ['subject', 'predicate', 'object'].includes(annotation.tag)))
  const subjectTag = documentElements.find(doc => doc.annotations.some(annotation => annotation.tag === 'subject'))?.annotations.find(annotation => annotation.tag === 'subject')
  const predicateTag = documentElements.find(doc => doc.annotations.some(annotation => annotation.tag === 'predicate'))?.annotations.find(annotation => annotation.tag === 'predicate')
  const objectTag = documentElements.find(doc => doc.annotations.some(annotation => annotation.tag === 'object'))?.annotations.find(annotation => annotation.tag === 'object')

  return (
    <div className="flex">
      <aside className="fixed hidden h-full w-[280px] bg-gray-100 px-8 pt-4 lg:block">
        <h2 className="mb-4 mt-8 text-xl font-bold">Documents in Corpus</h2>
        <ul>
          <li className="mb-3">
            <Link href="#1">WiMAX</Link>
          </li>
          <li className="mb-3">
            <Link href="#2">Near-field communication</Link>
          </li>
          <li className="mb-3">
            <Link href="#3" className="font-semibold text-blue-500">AirPort Extreme</Link>
          </li>
          <li className="mb-3">
            <Link href="#4">Bluetooth</Link>
          </li>
        </ul>
        <div className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 bg-gray-200 p-1">
          <Button variant="ghost" className="w-full py-8">
            Import Documents
          </Button>
        </div>
      </aside>
      <main className="ml-0 min-w-0 flex-1 md:mr-[280px] lg:ml-[280px]">
        <div className="container mx-auto p-4 lg:p-12">
          <Link href="/"><h1 className="mb-6 text-3xl font-bold">ECLADATTA Annotation Tool</h1></Link>
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              {sampleTable._source.identificationMetadata.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              <strong>Version Date:</strong>
              {' '}
              {sampleTable._source.identificationMetadata.versionDate}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Wikidata: </strong>
              {' '}
              <Link href={`https://www.wikidata.org/wiki/${sampleTable._source.identificationMetadata.wikidata}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">
                {sampleTable._source.identificationMetadata.wikidata}
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Wikipedia: </strong>
              <a href={sampleTable._source.identificationMetadata.url.slice(-1)[0]} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 underline">
                {sampleTable._source.identificationMetadata.url.slice(-1)[0]}
              </a>
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardDescription>Select text or table cells to start annotating</CardDescription>
            </CardHeader>
            <CardContent>
              {combinedElements.map(element => (
                <CombinedElement
                  key={`${element.startOffset}-${element.endOffset}`}
                  {...element}
                  handleSplitClick={handleSplitClick}
                  handleTableSelection={handleTableSelection}
                  handleTextSelection={handleTextSelection}
                  documentElements={documentElements}
                />
              ))}
            </CardContent>
          </Card>

          <div
            className={cn(
              'fixed bottom-0 left-1/2 w-full -translate-x-1/2 transition-transform duration-300 sm:w-2/3 sm:max-w-screen-sm',
              hasAnyTags ? 'translate-y-0' : 'translate-y-full',
            )}
          >
            <Card className="mb-6 rounded-none sm:rounded-xl">
              <CardHeader className="flex flex-row pb-4">
                <div>
                  <CardTitle>Finalize your annotation</CardTitle>
                  <CardDescription>Select entities for each subject, predicate, and object.</CardDescription>
                </div>
                <div className="ml-auto">
                  <Button onClick={createAnnotation} disabled={!hasAllTags}>
                    {editingAnnotation ? 'Update Annotation' : 'Create Annotation'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="mb-1 truncate rounded-md px-2 py-0.5 text-sm font-semibold" style={{ backgroundColor: TYPE_TO_COLOR.subject }}>{subjectTag?.value ?? '\u00A0'}</div>
                    <EntitySelector type="subject" value={selectedSubject} onValueChange={setSelectedSubject} />
                  </div>
                  <div>
                    <div className="mb-1 truncate rounded-md px-2 py-0.5 text-sm font-semibold" style={{ backgroundColor: TYPE_TO_COLOR.predicate }}>{predicateTag?.value ?? '\u00A0'}</div>
                    <EntitySelector type="predicate" value={selectedPredicate} onValueChange={setSelectedPredicate} />
                  </div>
                  <div>
                    <div className="mb-1 truncate rounded-md px-2 py-0.5 text-sm font-semibold" style={{ backgroundColor: TYPE_TO_COLOR.object }}>{objectTag?.value ?? '\u00A0'}</div>
                    <EntitySelector type="object" value={selectedObject} onValueChange={setSelectedObject} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popover for Selection */}
          {popoverPosition.visible && (
            <Popover
              open={popoverPosition.visible}
              onOpenChange={() => setPopoverPosition(prev => ({ ...prev, visible: false }))}
            >
              <PopoverTrigger asChild>
                <div
                  style={{
                    position: 'absolute',
                    top: popoverPosition.top,
                    left: popoverPosition.left,
                    zIndex: 1000,
                  }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto">
                <div className="flex gap-2">
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
      <aside className="fixed right-0 hidden h-full w-[280px] bg-gray-100 md:block">
        <div className="flex h-full flex-col px-8 pt-4">
          <h2 className="mb-4 mt-8 text-xl font-bold">Annotations</h2>
          <ul className="flex-1 space-y-3 overflow-y-auto pb-4">
            {documentAnnotations.map(ann => (
              <li key={ann.id} className="mb-3">
                <button
                  type="button"
                  className="w-full rounded-md bg-white p-2 text-left shadow hover:bg-gray-50"
                  onClick={
                    () => {
                      setEditingAnnotation(ann.id)

                      setSelectedSubject(ann.subject.entity)
                      setSelectedPredicate(ann.predicate.entity)
                      setSelectedObject(ann.object.entity)

                      setDocumentElements((prevElement) => {
                        const updatedElement: DocumentElement[]
                          = prevElement.map(el => ({ ...el, annotations: [] })) // Reset all annotations
                        // Add the selected annotations
                        updatedElement[ann.subject.annotation.elementIndex].annotations = [
                          ...updatedElement[ann.subject.annotation.elementIndex].annotations,
                          ann.subject.annotation,
                        ]
                        updatedElement[ann.predicate.annotation.elementIndex].annotations = [
                          ...updatedElement[ann.predicate.annotation.elementIndex].annotations,
                          ann.predicate.annotation,
                        ]
                        updatedElement[ann.object.annotation.elementIndex].annotations = [
                          ...updatedElement[ann.object.annotation.elementIndex].annotations,
                          ann.object.annotation,
                        ]
                        return updatedElement
                      })
                    }
                  }
                >
                  <span className="font-semibold text-orange-500">{ann.subject.annotation.value}</span>
                  {' '}
                  &rarr;
                  {' '}
                  <span className="font-semibold text-blue-500">{ann.predicate.annotation.value}</span>
                  {' '}
                  &rarr;
                  {' '}
                  <span className="font-semibold text-green-500">{ann.object.annotation.value}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
