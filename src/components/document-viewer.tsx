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
import { Check, Copy, InfoIcon, ListIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAnnotationState } from '@/hooks/useAnnotationState'
import { useAnnotationUrlSync } from '@/hooks/useAnnotationUrlSync'
import { useDocumentElements } from '@/hooks/useDocumentElements'
import { useSelectionHandlers } from '@/hooks/useSelectionState'
import { getAnnotationComponents } from '@/lib/annotation-roles'
import { isConstraintWarningsEnabled, isPredicateFilteringEnabled } from '@/lib/corpus-settings'
import { annotationComponentsShareSegment, cn, isMac } from '@/lib/utils'
import { AnnotationForm } from './annotation-form'
import { AnnotationListPopover } from './annotation-list-popover'
import { AnnotationsSidebar } from './annotations-sidebar'
import CombinedElement from './combined-element'
import { DocumentHeader } from './document-header'
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

export function DocumentViewer({
  corpus,
  documents,
  document,
  annotations,
  warningsSlot,
  readOnly = false,
}: DocumentViewerProps) {
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [copiedDocument, setCopiedDocument] = useState(false)
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
  } = annotationState

  const { handleTextSelection, handleTableSelection } = useSelectionHandlers(
    documentElements,
    selection,
    popover,
  )

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
    if (!document || !currentAnnotation)
      return
    const { subject, predicate, object } = currentAnnotation
    if (!subject || !predicate || !object)
      return
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
      setCopiedDocument(true)
      setTimeout(setCopiedDocument, 2000, false)
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
      setCopiedDocument(true)
      setTimeout(setCopiedDocument, 2000, false)
      toast.success('Document copied to clipboard as Markdown!')
    })
  }

  const ctrlKey = isMac() ? '⌘' : 'Ctrl'

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
          'min-h-0 min-w-0 flex-1 overflow-y-auto',
          currentAnnotation && 'pb-80 sm:pb-48',
        )}
      >
        <div className="mx-auto w-full max-w-4xl px-5 py-6 lg:px-8">
          {documentData && document && (
            <>
              <DocumentHeader
                document={document}
                documentData={documentData}
                readOnly={readOnly}
              />

              {warningsSlot}

              <Card className="mb-6 min-w-0 overflow-clip">
                <CardHeader className="flex h-10 min-w-0 flex-row items-center justify-between gap-2 border-b px-3 py-0 max-md:sticky max-md:top-0 max-md:z-10 max-md:bg-card">
                  <CardDescription className="mb-0 min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                    Select text or table cells to start annotating
                  </CardDescription>
                  <div className="flex shrink-0 items-center gap-1">
                    {documentAnnotations.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 md:hidden"
                        onClick={() => setMobileAnnotationsOpen(true)}
                      >
                        <ListIcon className="size-3.5" />
                        <span className="text-xs">{documentAnnotations.length}</span>
                        <span className="sr-only">Open annotations panel</span>
                      </Button>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          aria-label="Keyboard shortcuts"
                        >
                          <InfoIcon className="size-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Keyboard Shortcuts</DialogTitle>
                          <DialogDescription>
                            Use these shortcuts to speed up your annotation
                            workflow
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="mb-2 text-sm font-medium">
                              Annotation Actions
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Mark as Subject</span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  S
                                </kbd>
                              </div>
                              <div className="flex justify-between">
                                <span>Mark as Predicate</span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  P
                                </kbd>
                              </div>
                              <div className="flex justify-between">
                                <span>Mark as Object</span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  O
                                </kbd>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="mb-2 text-sm font-medium">
                              Navigation
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>
                                  Edit annotation (when popover visible)
                                </span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  E
                                </kbd>
                              </div>
                              <div className="flex justify-between">
                                <span>
                                  Clone annotation (when popover visible)
                                </span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  C
                                </kbd>
                              </div>
                              <div className="flex justify-between">
                                <span>Toggle annotations visibility</span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  H
                                </kbd>
                              </div>
                              <div className="flex justify-between">
                                <span>Clear/Cancel</span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  Esc
                                </kbd>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="mb-2 text-sm font-medium">
                              Form Actions
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Clone annotation</span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  C
                                </kbd>
                              </div>
                              <div className="flex justify-between">
                                <span>Save annotation</span>
                                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                                  {ctrlKey}
                                  +S
                                </kbd>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          aria-label="Copy document"
                        >
                          {copiedDocument
                            ? (
                                <Check className="size-3.5" />
                              )
                            : (
                                <Copy className="size-3.5" />
                              )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={copyTextOnly}>
                          Copy Text Only
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={copyWholeDocument}>
                          Copy Whole Document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0">
                  {combinedElements.map(element => (
                    <CombinedElement
                      key={`element-${element.elementIndex}`}
                      {...element}
                      handleSplitClick={handleSplitClick}
                      handleTableSelection={handleTableSelection}
                      handleTextSelection={handleTextSelection}
                      documentElements={documentElements}
                      currentAnnotation={currentAnnotation}
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
            />
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
