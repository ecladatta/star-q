'use client'
import { EntitySelector } from '@/components/entity-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { selectionIsBackwards, selectionIsEmpty } from '@/lib/utils'
import sortBy from 'lodash.sortby'
import { BoxIcon, LinkIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
// @ts-expect-error - no types available
import wtf from 'wtf_wikipedia'
import Mark from './mark'
import sampleTable from './sample_table.json'

export type TextElement = {
  type: 'text'
  startOffset: number
  endOffset: number
  value: string
  data: any
  index: number
}

export type TableElement = {
  type: 'table'
  startOffset: number
  endOffset: number
  value: string[][]
  data: any
  index: number
}

export type CombinedElement = TextElement | TableElement

const TYPE_TO_COLOR = {
  subject: '#FFE4B5',
  predicate: '#ADD8E6',
  object: '#90EE90',
}

function Split(props: { start: number, end: number, content: string, mark?: boolean, onClick: (arg0: any) => any },
) {
  if (props.mark)
    return <Mark {...props} />

  return (
    <span
      role="button"
      className="whitespace-pre-wrap"
      tabIndex={0}
      data-start={props.start}
      data-end={props.end}
      onClick={() => props.onClick({ start: props.start, end: props.end })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          props.onClick({ start: props.start, end: props.end })
        }
      }}
    >
      {props.content}
    </span>
  )
}

function splitWithOffsets(text: string, source: 'text' | 'table', offsets: { start: number, end: number, row?: number, cell?: number }[]) {
  let lastEnd = 0
  const splits = []

  for (const offset of sortBy(offsets, o => o.start)) {
    const { start, end } = offset
    if (lastEnd < start) {
      splits.push({
        start: lastEnd,
        end: start,
        source,
        content: text.slice(lastEnd, start),
      })
    }
    splits.push({
      ...offset,
      mark: true,
      source,
      content: text.slice(start, end),
    })
    lastEnd = end
  }
  if (lastEnd < text.length) {
    splits.push({
      start: lastEnd,
      end: text.length,
      source,
      content: text.slice(lastEnd, text.length),
    })
  }

  return splits
}

type Annotation = {
  value: string
  start: number
  end: number
  type: string
  tag: 'subject' | 'predicate' | 'object'
  color: string
  row?: number
  cell?: number
}

export default function DocumentAnnotation() {
  const [popoverPosition, setPopoverPosition] = useState({
    top: 0,
    left: 0,
    visible: false,
  })
  const [documentAnnotations, setDocumentAnnotations] = useState<({ annotations: Annotation[], value: string | string[][] })[]>([])
  const [selectedOffset, setSelectedOffset] = useState({ start: 0, end: 0 })
  const [currentElementIndex, setCurrentElementIndex] = useState<number | null>(null)
  const [combinedElements, setCombinedElements] = useState<CombinedElement[]>([])
  const [tableSelection, setTableSelection] = useState<{ rowIndex: number, cellIndex: number } | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<{ label: string, value: string } | null>(null)
  const [selectedPredicate, setSelectedPredicate] = useState<{ label: string, value: string } | null>(null)
  const [selectedObject, setSelectedObject] = useState<{ label: string, value: string } | null>(null)

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

    setDocumentAnnotations((prev) => {
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
        ...selectedOffset,
        value: value.slice(selectedOffset.start, selectedOffset.end),
        type: currentElementType,
        tag: type,
        color: TYPE_TO_COLOR[type],
      }
      if (currentElementType === 'table' && tableSelection) {
        newAnnotation.row = tableSelection.rowIndex
        newAnnotation.cell = tableSelection.cellIndex
      }
      const hasOverlap = currentAnnotations.some((annotation) => {
        if (currentElementType === 'text') {
          return newAnnotation.start < annotation.end && newAnnotation.end > annotation.start
        } else if (currentElementType === 'table' && tableSelection) {
          return (
            newAnnotation.row === annotation.row
            && newAnnotation.cell === annotation.cell
            && newAnnotation.start < annotation.end
            && newAnnotation.end > annotation.start
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
            !(newAnnotation.start < annotation.end && newAnnotation.end > annotation.start),
          ).concat(newAnnotation),
        }
      }

      return updatedAnnotations
    })

    // Reset selection and popover
    setPopoverPosition(prev => ({ ...prev, visible: false }))
  }

  const resetAnnotations = useCallback(() => {
    setDocumentAnnotations(combinedElements.map(el => ({ annotations: [], value: el.value })))
  }, [combinedElements])

  const createAnnotation = () => {
    // Save the annotation
    const subjectTag = documentAnnotations.find(doc => doc.annotations.some(annotation => annotation.tag === 'subject'))?.annotations.find(annotation => annotation.tag === 'subject')
    const predicateTag = documentAnnotations.find(doc => doc.annotations.some(annotation => annotation.tag === 'predicate'))?.annotations.find(annotation => annotation.tag === 'predicate')
    const objectTag = documentAnnotations.find(doc => doc.annotations.some(annotation => annotation.tag === 'object'))?.annotations.find(annotation => annotation.tag === 'object')

    // @TODO: Send the annotation to the server
    // eslint-disable-next-line no-console
    console.log('Annotation:', {
      subject: {
        tag: subjectTag,
        entity: selectedSubject,
      },
      predicate: {
        tag: predicateTag,
        entity: selectedPredicate,
      },
      object: {
        tag: objectTag,
        entity: selectedObject,
      },
    })

    // Remove all annotations
    resetAnnotations()
    // Reset selection and popover
    setPopoverPosition(prev => ({ ...prev, visible: false }))

    toast.success('Annotation created!')
  }

  const handleSplitClick = (textIndex: number, { start, end }: { start: number, end: number }) => {
    setDocumentAnnotations((prev) => {
      const updatedAnnotations = [...prev]
      const splitIndex = updatedAnnotations[textIndex].annotations.findIndex(s => s.start === start && s.end === end)
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
    ].sort((a, b) => a.startOffset - b.startOffset).map((element, index) => ({
      ...element,
      index,
    }))

    setCombinedElements(els)
  }, [])

  useEffect(() => {
    resetAnnotations()
  }, [resetAnnotations])

  const renderElement = (element: CombinedElement) => {
    if (!documentAnnotations[element.index]) {
      return null
    }

    if (element.type === 'text') {
      const index = element.index
      const rawText = element.value

      const splits = splitWithOffsets(rawText, 'text', documentAnnotations[index].annotations)

      return (
        <div key={index} className="mb-4">
          {React.createElement(element.data.level ? `h${element.data.level}` : 'div', { className: 'mb-2 font-semibold' }, element.data.title)}
          <div
            className="text-lg leading-relaxed"
            role="textbox"
            tabIndex={0}
            onMouseUp={() => handleTextSelection(index)}
            onKeyUp={e => e.key === 'Enter' && handleTextSelection(index)}
          >
            {splits
              .filter(split => split.source === 'text')
              .map(split => (
                <Split key={`${split.start}-${split.end}`} {...split} onClick={() => handleSplitClick(index, split)} />
              ))}
          </div>
        </div>
      )
    } else if (element.type === 'table') {
      const index = element.index
      const tableData = element.value

      const splits = tableData.map((row, rowIndex) =>
        row.map((cell, cellIndex) => {
          const cellAnnotations = documentAnnotations[index].annotations.filter(
            annotation => annotation.row === rowIndex && annotation.cell === cellIndex,
          )
          return splitWithOffsets(cell, 'table', cellAnnotations)
        }),
      )

      return (
        <div key={index} className="mb-6">
          <Table>
            <TableHeader>
              {splits.slice(0, 1).map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cellSplits, cellIndex) => (
                    <TableHead
                      key={cellIndex}
                      role="button"
                      tabIndex={0}
                      onMouseUp={() => handleTableSelection(index, 0, cellIndex)}
                      onKeyUp={e => e.key === 'Enter' && handleTableSelection(index, 0, cellIndex)}
                    >
                      {cellSplits.map(split => (
                        <Split key={`${split.start}-${split.end}`} {...split} onClick={() => handleSplitClick(index, split)} />
                      ))}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {splits.slice(1).map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cellSplits, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      role="button"
                      tabIndex={0}
                      onMouseUp={() => handleTableSelection(index, rowIndex + 1, cellIndex)}
                      onKeyUp={e => e.key === 'Enter' && handleTableSelection(index, rowIndex + 1, cellIndex)}
                    >
                      {cellSplits.map(split => (
                        <Split key={`${split.start}-${split.end}`} {...split} onClick={() => handleSplitClick(index, split)} />
                      ))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }
    return element
  }

  const hasAllTags = ['subject', 'predicate', 'object'].every(tag => documentAnnotations.some(doc => doc.annotations.some(annotation => annotation.tag === tag)))
  const hasAnyTags = documentAnnotations.some(doc => doc.annotations.some(annotation => ['subject', 'predicate', 'object'].includes(annotation.tag)))
  const subjectTag = documentAnnotations.find(doc => doc.annotations.some(annotation => annotation.tag === 'subject'))?.annotations.find(annotation => annotation.tag === 'subject')
  const predicateTag = documentAnnotations.find(doc => doc.annotations.some(annotation => annotation.tag === 'predicate'))?.annotations.find(annotation => annotation.tag === 'predicate')
  const objectTag = documentAnnotations.find(doc => doc.annotations.some(annotation => annotation.tag === 'object'))?.annotations.find(annotation => annotation.tag === 'object')

  return (
    <div className="flex">
      <aside className="fixed hidden h-full w-[280px] bg-gray-100 px-8 pt-4 sm:block">
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
      <main className="ml-0 min-w-0 flex-1 sm:ml-[280px]">
        <div className="container mx-auto p-12">
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
                <React.Fragment key={`${element.startOffset}-${element.endOffset}`}>{renderElement(element)}</React.Fragment>
              ))}
            </CardContent>
          </Card>

          <div
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 transition-transform duration-300 ${
              hasAnyTags ? 'translate-y-0' : 'translate-y-full'
            } w-full sm:w-2/3 sm:max-w-screen-sm`}
          >
            <Card className="mb-6 rounded-none sm:rounded-xl">
              <CardHeader className="flex flex-row pb-4">
                <div>
                  <CardTitle>Finalize your annotation</CardTitle>
                  <CardDescription>Select entities for each subject, predicate, and object.</CardDescription>
                </div>
                <div className="ml-auto">
                  <Button onClick={createAnnotation} disabled={!hasAllTags}>
                    Create Annotation
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
    </div>
  )
}
