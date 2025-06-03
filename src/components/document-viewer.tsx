'use client'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Corpus, Document } from '@/db/schema'
import type { Offset } from '@/lib/utils'
import type { DocumentAnnotation, DocumentData } from '@/types/types'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAnnotationState } from '@/hooks/useAnnotationState'
import { useDocumentElements } from '@/hooks/useDocumentElements'
import { useSelectionHandlers } from '@/hooks/useSelectionState'
import { cn } from '@/lib/utils'
import { AnnotationForm } from './annotation-form'
import { AnnotationsSidebar } from './annotations-sidebar'
import CombinedElement from './combined-element'
import { DocumentHeader } from './document-header'
import { DocumentSidebar } from './document-sidebar'
import { SelectionPopover } from './selection-popover'

type DocumentViewerProps = {
  corpus: Corpus
  documents: DocumentMetadata[]
  document?: Document
  annotations?: DocumentAnnotation[]
}

export function DocumentViewer({ corpus, documents, document, annotations }: DocumentViewerProps) {
  const [showAnnotations, setShowAnnotations] = useState(true)

  const documentData = document?.raw as (DocumentData | undefined)
  const combinedElements = useDocumentElements(documentData)

  const annotationState = useAnnotationState(annotations, combinedElements, showAnnotations, setShowAnnotations)
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
    selection,
    popover,
  } = annotationState

  const { handleTextSelection, handleTableSelection } = useSelectionHandlers(
    documentElements,
    selection,
    popover,
  )

  const handleSplitClick = ({ componentId }: Offset) => {
    const ann = documentAnnotations.find(ann =>
      ann.subjectId === componentId || ann.predicateId === componentId || ann.objectId === componentId,
    )
    if (!ann)
      return

    const domSelection = window.getSelection()
    if (!domSelection)
      return

    const rect = domSelection.getRangeAt(0).getClientRects()[0]
    popover.setPopoverState({
      top: rect.top + window.scrollY - 80,
      left: rect.left + window.scrollX,
      visible: true,
      annotation: ann,
      componentId,
    })
  }

  const handleAnnotationClick = (annotation: DocumentAnnotation) => {
    if (annotation.id === currentAnnotation?.id) {
      setCurrentAnnotation(null)
      return
    }
    setCurrentAnnotation(annotation)
    const element = window.document.getElementById(`element-${annotation.subject.elementIndex}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSaveAnnotation = async () => {
    if (!document || !currentAnnotation)
      return
    const { subject, predicate, object } = currentAnnotation
    if (!subject || !predicate || !object)
      return
    await createAnnotation(document.id, subject, predicate, object)
  }

  const handleDeleteAnnotation = async () => {
    if (!currentAnnotation?.id)
      return
    await deleteAnnotationById(currentAnnotation.id)
  }

  const handleEditAnnotation = (annotation: DocumentAnnotation) => {
    setCurrentAnnotation(annotation)
    popover.hidePopover()
  }

  return (
    <div className="flex">
      {documentData && (
        <DocumentSidebar
          corpus={corpus}
          documents={documents}
          currentDocument={document}
        />
      )}

      <main className={cn(
        'ml-0 min-w-0 flex-1 lg:ml-[280px]',
        documentAnnotations.length > 0 && 'md:mr-[280px]',
      )}
      >
        <div className="container mx-auto p-6 lg:px-12">
          {documentData && (
            <>
              <DocumentHeader corpus={corpus} documentData={documentData} />

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{documentData._source.identificationMetadata.title}</CardTitle>
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
                      currentAnnotation={currentAnnotation}
                    />
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <AnnotationForm
            currentAnnotation={currentAnnotation}
            setCurrentAnnotation={setCurrentAnnotation}
            onSave={handleSaveAnnotation}
            onDelete={handleDeleteAnnotation}
            annotationFormLoading={annotationFormLoading}
            isDeletingAnnotation={isDeletingAnnotation}
            corpusId={corpus.id}
          />

          <SelectionPopover
            popoverState={popover.popoverState}
            onClose={popover.hidePopover}
            onMentionAssociation={handleSelectionMentionAssociation}
            onEditAnnotation={handleEditAnnotation}
          />
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
      />
    </div>
  )
}
