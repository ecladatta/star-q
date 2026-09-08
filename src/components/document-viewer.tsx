'use client'
import type { ReactNode } from 'react'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Corpus, Document } from '@/db/schema'
import type { Offset } from '@/lib/utils'
import type {
  DocumentAnnotation,
  DocumentAnnotationComponent,
  DocumentData,
} from '@/types/types'
import { CalendarDays, ListPlusIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAnnotationState } from '@/hooks/useAnnotationState'
import { useAnnotationUrlSync } from '@/hooks/useAnnotationUrlSync'
import { useDocumentElements } from '@/hooks/useDocumentElements'
import { useSelectionHandlers } from '@/hooks/useSelectionState'
import { useWikibaseInstance } from '@/hooks/useWikibaseInstance'
import { getAnnotationComponents } from '@/lib/annotation-roles'
import { CONSTANT_ROLES } from '@/lib/cell-batch'
import { isConstraintWarningsEnabled, isPredicateFilteringEnabled } from '@/lib/corpus-settings'
import { annotationComponentsShareSegment, cn } from '@/lib/utils'
import { AnnotationForm } from './annotation-form'
import { AnnotationListPopover } from './annotation-list-popover'
import { AnnotationsSidebar } from './annotations-sidebar'
import CombinedElement from './combined-element'
import { DocumentHeader } from './document-header'
import { DocumentPopoverAnchor } from './document-popover-anchor'
import { DocumentSidebar } from './document-sidebar'
import { ReadOnlyAnnotationDetail } from './readonly-annotation-detail'
import { SelectionPopover } from './selection-popover'

type QualifierSide = 'predicate' | 'value'

function getPopoverAnchorFromRect(rect: DOMRect | DOMRectReadOnly) {
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    anchorWidth: Math.max(rect.width, 1),
    anchorHeight: Math.max(rect.height, 1),
  }
}

type DocumentViewerProps = {
  corpus: Corpus
  documents: DocumentMetadata[]
  document?: Document
  annotations?: DocumentAnnotation[]
  warningsSlot?: ReactNode
  readOnly?: boolean
}

function formatVersionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return value
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

function getUrlLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function DocumentMeta({ documentData }: { documentData: DocumentData }) {
  const { wikiUrl } = useWikibaseInstance()
  const { versionDate, wikidata, url } = documentData._source.identificationMetadata
  const urls = Array.isArray(url) ? url : url ? [url] : []
  const wikidataUrl = wikidata ? wikiUrl(wikidata) : null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {versionDate && (
        <span className="flex items-center gap-1.5" title={versionDate}>
          <CalendarDays className="size-3.5 shrink-0" />
          {formatVersionDate(versionDate)}
        </span>
      )}
      {wikidata && (
        <span className="flex items-center gap-1.5">
          <span>Wikidata</span>
          {wikidataUrl
            ? (
                <Link
                  href={wikidataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on Wikidata"
                  className="text-accent hover:underline"
                >
                  {wikidata}
                </Link>
              )
            : <span>{wikidata}</span>}
        </span>
      )}
      {urls.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{urls.length > 1 ? 'Sources' : 'Source'}</span>
          {urls.map(url => (
            <Link
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={url}
              className="text-accent hover:underline"
            >
              {getUrlLabel(url)}
            </Link>
          ))}
        </span>
      )}
    </div>
  )
}

export function DocumentViewer({
  corpus,
  documents,
  document,
  annotations,
  warningsSlot,
  readOnly = false,
}: DocumentViewerProps) {
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [mobileAnnotationsOpen, setMobileAnnotationsOpen] = useState(false)
  const [activeQualifierId, setActiveQualifierId] = useState<string | null>(
    null,
  )

  const documentData = document?.raw as DocumentData | undefined
  const combinedElements = useDocumentElements(documentData)

  const annotationState = useAnnotationState(
    annotations,
    combinedElements,
    showAnnotations,
    setShowAnnotations,
  )
  const {
    documentAnnotations,
    currentAnnotation,
    setCurrentAnnotation,
    annotationFormLoading,
    isDeletingAnnotation,
    isBatchDeleting,
    selectedAnnotations,
    handleAnnotationSelect,
    handleBatchDelete,
    documentElements,
    createAnnotation,
    deleteAnnotationById,
    handleSelectionMentionAssociation,
    handleCloneAnnotation,
    removeQualifier,
    assignSelectionToQualifier,
    assignSelectionToNextQualifier,
    updateQualifierEntity,
    clearQualifierSide,
    selection,
    popover,
    cellBatch,
  } = annotationState

  const { handleTextSelection, handleTableSelection } = useSelectionHandlers(
    documentElements,
    selection,
    popover,
  )

  const handleTableCellMouseUp = useCallback((index: number, row: number, col: number) => {
    if (cellBatch.handleCellMouseUp()) {
      return
    }

    // Small delay to ensure selection state is properly updated
    setTimeout(handleTableSelection, 50, index, row, col)
  }, [cellBatch, handleTableSelection])

  const popoverAnnotateColumnTarget = useMemo(() => {
    if (readOnly || !popover.popoverState.visible || popover.popoverState.annotation) {
      return null
    }
    const elementIndex = selection.currentElementIndex
    const tableSelection = selection.tableSelection
    if (elementIndex === null || !tableSelection) {
      return null
    }
    if (documentElements[elementIndex]?.type !== 'table') {
      return null
    }
    return { elementIndex, col: tableSelection.cellIndex }
  }, [readOnly, popover.popoverState, selection, documentElements])

  const handleQualifierSelectionAssociation = useCallback(
    (side: QualifierSide) => {
      const activeQualifierExists = Boolean(
        activeQualifierId
        && currentAnnotation?.qualifiers?.some(
          qualifier => qualifier.id === activeQualifierId,
        ),
      )

      if (activeQualifierId && activeQualifierExists) {
        assignSelectionToQualifier(activeQualifierId, side)
        return
      }

      assignSelectionToNextQualifier(side)
    },
    [
      activeQualifierId,
      assignSelectionToNextQualifier,
      assignSelectionToQualifier,
      currentAnnotation?.qualifiers,
    ],
  )

  const componentById = useMemo(() => {
    const map = new Map<string, DocumentAnnotationComponent>()
    for (const element of documentElements) {
      for (const component of element.components) {
        map.set(component.id, component)
      }
    }
    return map
  }, [documentElements])

  const scrollToAnnotation = (annotation: DocumentAnnotation) => {
    const element = window.document.getElementById(
      `element-${annotation.subject.elementIndex}`,
    )
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const scrollToAnnotationComponent = (component: DocumentAnnotationComponent) => {
    const element = window.document.getElementById(
      `element-${component.elementIndex}`,
    )
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSplitClick = ({ componentId }: Offset, anchorRect?: DOMRect) => {
    if (!componentId)
      return

    const clickedComponent = componentById.get(componentId)
    if (!clickedComponent)
      return

    const matchingAnnotations = documentAnnotations.filter(annotation =>
      getAnnotationComponents(annotation).some(component =>
        annotationComponentsShareSegment(component, clickedComponent),
      ),
    )

    if (matchingAnnotations.length === 0)
      return

    if (!anchorRect)
      return

    popover.showPopover({
      ...getPopoverAnchorFromRect(anchorRect),
      annotation: null,
      componentId,
      annotations: matchingAnnotations,
      mentionData: {
        start: clickedComponent.annotationStart,
        end: clickedComponent.annotationEnd,
        elementIndex: clickedComponent.elementIndex,
        row: clickedComponent.annotationRow,
        cell: clickedComponent.annotationCell,
        value: clickedComponent.annotationValue,
        annotationType: clickedComponent.annotationType,
      },
    })
  }

  const { openAnnotation, toggleAnnotation } = useAnnotationUrlSync({
    annotations: documentAnnotations,
    currentAnnotationId: currentAnnotation?.id ?? null,
    onOpen: (annotation, scroll = true) => {
      setCurrentAnnotation(annotation)
      if (scroll) {
        scrollToAnnotation(annotation)
      }
    },
    onClose: () => setCurrentAnnotation(null),
  })

  const handleAnnotationClick = toggleAnnotation

  const handleSaveAnnotation = async () => {
    if (!document) {
      return
    }

    if (cellBatch.batchMode) {
      await cellBatch.createBatch(document.id)
      return
    }

    if (!currentAnnotation) {
      return
    }
    const { subject, predicate, object } = currentAnnotation
    if (!subject || !predicate || !object) {
      return
    }
    await createAnnotation(document.id, subject, predicate, object)
  }

  const handleEditAnnotation = (annotation: DocumentAnnotation) => {
    openAnnotation(annotation, false)
    popover.hidePopover()
  }

  const copyTextOnly = () => {
    if (!documentData)
      return

    const title = documentData._source.identificationMetadata.title
    let markdown = `# ${title}\n\n`

    combinedElements.forEach((element) => {
      // Only copy text elements, skip tables
      if (element.type === 'text') {
        const textValue = element.value as string
        const heading = element.data.title
        const level = element.data.level

        if (heading && level) {
          markdown += `${'#'.repeat(level)} ${heading}\n\n`
        } else if (heading) {
          markdown += `**${heading}**\n\n`
        }

        markdown += `${textValue}\n\n`
      }
    })

    navigator.clipboard.writeText(markdown).then(() => {
      toast.success('Text copied to clipboard as Markdown!')
    })
  }

  const copyWholeDocument = () => {
    if (!documentData)
      return

    const title = documentData._source.identificationMetadata.title
    let markdown = `# ${title}\n\n`

    combinedElements.forEach((element) => {
      if (element.type === 'text') {
        const textValue = element.value as string
        const heading = element.data.title
        const level = element.data.level

        if (heading && level) {
          markdown += `${'#'.repeat(level)} ${heading}\n\n`
        } else if (heading) {
          markdown += `**${heading}**\n\n`
        }

        markdown += `${textValue}\n\n`
      } else if (element.type === 'table') {
        const tableData = element.value as string[][]

        if (element.data.title) {
          markdown += `**${element.data.title}**\n\n`
        }

        tableData.forEach((row, rowIndex) => {
          const cells = row.map(cell => cell.replace(/\|/g, '\\|'))
          markdown += `| ${cells.join(' | ')} |\n`

          if (rowIndex === 0) {
            markdown += `| ${cells.map(() => '---').join(' | ')} |\n`
          }
        })

        markdown += '\n'
      }
    })

    navigator.clipboard.writeText(markdown).then(() => {
      toast.success('Document copied to clipboard as Markdown!')
    })
  }

  return (
    <div className="flex h-full min-h-0">
      {documentData && (
        <DocumentSidebar
          documents={documents}
          currentDocument={document}
        />
      )}

      <main
        className={cn(
          'min-w-0 flex-1',
          currentAnnotation && 'pb-80 sm:pb-48',
        )}
      >
        {documentData && document && (
          <DocumentHeader
            document={document}
            documentData={documentData}
            readOnly={readOnly}
            annotationsCount={documentAnnotations.length}
            onOpenAnnotations={() => setMobileAnnotationsOpen(true)}
            onCopyText={copyTextOnly}
            onCopyWholeDocument={copyWholeDocument}
          />
        )}

        <div className="document-container mx-auto w-full max-w-4xl px-5 py-6 lg:px-8">
          {documentData && document && (
            <>
              <DocumentMeta documentData={documentData} />

              {warningsSlot}

              <Card className="mb-6 min-w-0 rounded-none border-none shadow-none">
                <CardContent className="min-w-0 p-0">
                  {combinedElements.map(element => (
                    <CombinedElement
                      key={`element-${element.elementIndex}`}
                      {...element}
                      handleSplitClick={handleSplitClick}
                      handleTableSelection={handleTableSelection}
                      handleTableCellPointerDown={(index, row, col, event) =>
                        cellBatch.handleCellPointerDown({ elementIndex: index, row, col }, event)}
                      handleTableCellDragOver={(index, row, col) =>
                        cellBatch.handleCellDragOver({ elementIndex: index, row, col })}
                      handleTableCellMouseUp={handleTableCellMouseUp}
                      handleTextSelection={handleTextSelection}
                      documentElements={documentElements}
                      currentAnnotation={currentAnnotation}
                      selectedCellKeys={cellBatch.selectedKeys}
                      onSelectColumn={(col, additive) =>
                        cellBatch.handleSelectColumn(element.elementIndex, col, additive)}
                      readOnly={readOnly}
                    />
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {!readOnly && (
            <AnnotationForm
              currentAnnotation={currentAnnotation}
              setCurrentAnnotation={setCurrentAnnotation}
              onSave={handleSaveAnnotation}
              onDelete={deleteAnnotationById}
              annotationFormLoading={annotationFormLoading}
              isDeletingAnnotation={isDeletingAnnotation}
              corpusId={corpus.id}
              wikidataPredicateFiltering={isPredicateFilteringEnabled(corpus.settings)}
              wikidataConstraintWarnings={isConstraintWarningsEnabled(corpus.settings)}
              removeQualifier={removeQualifier}
              assignSelectionToQualifier={assignSelectionToQualifier}
              updateQualifierEntity={updateQualifierEntity}
              clearQualifierSide={clearQualifierSide}
              hasActiveSelection={selection.hasSelection()}
              onActiveQualifierChange={setActiveQualifierId}
              batchMode={cellBatch.batchMode}
              batchCreating={cellBatch.creating}
              batchCellRole={cellBatch.cellRole}
              batchCellsCount={cellBatch.cells.length}
              onBatchCellRoleChange={cellBatch.setCellRole}
              batchReady={Boolean(
                CONSTANT_ROLES[cellBatch.cellRole].every(role => currentAnnotation?.[role])
                && (cellBatch.preview?.createCount ?? 0) > 0,
              )}
              batchSummary={cellBatch.preview?.createCount === 0
                ? 'Nothing to create'
                : cellBatch.preview
                  ? `Create ${cellBatch.preview.createCount} annotation${cellBatch.preview.createCount === 1 ? '' : 's'}`
                  : null}
              onBatchExit={cellBatch.exitBatchMode}
            />
          )}

          {readOnly && currentAnnotation?.id && (
            <ReadOnlyAnnotationDetail
              annotation={currentAnnotation as DocumentAnnotation}
              onClose={() => setCurrentAnnotation(null)}
              onLocate={scrollToAnnotationComponent}
            />
          )}

          {/* Show AnnotationListPopover when clicking on existing annotations with shared segments */}
          {popover.popoverState.visible
            && (popover.popoverState.annotations?.length ?? 0) > 0 && (
            <AnnotationListPopover
              visible={true}
              top={popover.popoverState.top}
              left={popover.popoverState.left}
              anchorWidth={popover.popoverState.anchorWidth}
              anchorHeight={popover.popoverState.anchorHeight}
              annotations={popover.popoverState.annotations ?? []}
              onClose={popover.hidePopover}
              onEdit={handleEditAnnotation}
              onClone={handleCloneAnnotation}
              onDelete={deleteAnnotationById}
              onView={annotation => setCurrentAnnotation(annotation)}
              isDeletingAnnotation={isDeletingAnnotation}
              onCreateMention={handleSelectionMentionAssociation}
              mentionData={popover.popoverState.mentionData ?? null}
              readOnly={readOnly}
            />
          )}

          {/* Show SelectionPopover when making a new text selection */}
          {!readOnly
            && popover.popoverState.visible
            && (popover.popoverState.annotations?.length ?? 0) === 0 && (
            <SelectionPopover
              popoverState={popover.popoverState}
              onClose={popover.hidePopover}
              onDelete={deleteAnnotationById}
              isDeletingAnnotation={isDeletingAnnotation}
              onMentionAssociation={handleSelectionMentionAssociation}
              onQualifierSelectionAssociation={
                handleQualifierSelectionAssociation
              }
              hasCurrentAnnotation={Boolean(currentAnnotation)}
              onEditAnnotation={handleEditAnnotation}
              onAnnotateColumn={popoverAnnotateColumnTarget
                ? () =>
                    cellBatch.handleAnnotateColumnFromPopover(
                      popoverAnnotateColumnTarget.elementIndex,
                      popoverAnnotateColumnTarget.col,
                    )
                : undefined}
            />
          )}

          {/* Floating chip for multi-cell selections */}
          {!readOnly && cellBatch.chipRect && !cellBatch.batchMode && !cellBatch.dragging && (
            <Popover open={true}>
              <DocumentPopoverAnchor
                top={cellBatch.chipRect.top}
                left={cellBatch.chipRect.left}
                width={cellBatch.chipRect.width}
                height={cellBatch.chipRect.height}
              />
              <PopoverContent
                side="top"
                sideOffset={6}
                className="w-auto p-1"
                onOpenAutoFocus={event => event.preventDefault()}
                onMouseDown={event => event.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs font-medium"
                    onClick={() => cellBatch.openBatchMode()}
                  >
                    <ListPlusIcon className="size-3.5" />
                    Annotate
                    {' '}
                    {cellBatch.cells.length}
                    {' '}
                    cells
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={cellBatch.clearCells}
                        aria-label="Clear cell selection"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear selection (Esc)</TooltipContent>
                  </Tooltip>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </main>

      <AnnotationsSidebar
        annotations={documentAnnotations}
        showAnnotations={showAnnotations}
        onShowAnnotationsChange={setShowAnnotations}
        currentAnnotation={currentAnnotation}
        onAnnotationClick={handleAnnotationClick}
        selectedAnnotations={selectedAnnotations}
        onAnnotationSelect={handleAnnotationSelect}
        onBatchDelete={handleBatchDelete}
        isBatchDeleting={isBatchDeleting}
        readOnly={readOnly}
        mobileSheet={{ open: mobileAnnotationsOpen, onOpenChange: setMobileAnnotationsOpen }}
      />
    </div>
  )
}
