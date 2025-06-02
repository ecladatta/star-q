import type { CurrentAnnotation, DocumentAnnotation } from '@/types/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2Icon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Label } from './ui/label'

type AnnotationsSidebarProps = {
  annotations: DocumentAnnotation[]
  showAnnotations: boolean
  onShowAnnotationsChange: (show: boolean) => void
  currentAnnotation: CurrentAnnotation | null
  onAnnotationClick: (annotation: DocumentAnnotation) => void
  selectedAnnotations: Set<string>
  onAnnotationSelect: (annotationId: string, selected: boolean) => void
  onBatchDelete: () => void
  isBatchDeleting: boolean
}

export function AnnotationsSidebar({
  annotations,
  showAnnotations,
  onShowAnnotationsChange,
  currentAnnotation,
  onAnnotationClick,
  selectedAnnotations,
  onAnnotationSelect,
  onBatchDelete,
  isBatchDeleting,
}: AnnotationsSidebarProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  if (annotations.length === 0) {
    return null
  }

  const allSelected = annotations.length > 0 && annotations.every(ann => selectedAnnotations.has(ann.id))
  const someSelected = selectedAnnotations.size > 0

  const handleSelectAll = (checked: boolean) => {
    annotations.forEach((ann) => {
      onAnnotationSelect(ann.id, checked)
    })
  }

  const handleDeleteClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = () => {
    setShowConfirmDialog(false)
    onBatchDelete()
  }

  return (
    <>
      <aside className="fixed right-0 top-0 hidden h-screen w-[280px] bg-gray-100 pt-16 md:block">
        <div className="flex h-full flex-col">
          <div className="px-6">
            <h2 className="mb-2 mt-6 shrink-0 text-xl font-bold">Annotations</h2>
            <div className="mb-4 flex shrink-0 items-center gap-1">
              <Checkbox
                id="show-annotations"
                checked={showAnnotations}
                onCheckedChange={checked => onShowAnnotationsChange(checked === true)}
              />
              <Label htmlFor="show-annotations">
                Highlight annotations in doc
              </Label>
            </div>

            {/* Selection controls */}
            <div className="mb-4 flex items-center gap-1">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                // className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' } : {})}
              />
              <Label htmlFor="select-all" className="text-sm">
                Select all
              </Label>
            </div>
            <div className="mb-4 space-y-2">
              {someSelected && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteClick}
                    disabled={isBatchDeleting}
                    className="w-full"
                  >
                    {isBatchDeleting
                      ? (
                          <Loader2Icon className="mr-2 size-4 animate-spin" />
                        )
                      : (
                          <Trash2Icon className="mr-2 size-4" />
                        )}
                    Delete
                    {' '}
                    {selectedAnnotations.size}
                    {' '}
                    annotation
                    {selectedAnnotations.size > 1 ? 's' : ''}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="size-full">
              <ul className="space-y-3 px-6 pb-4 pt-1">
                {annotations.map((ann) => {
                  const isSelected = currentAnnotation?.id === ann.id
                  const isChecked = selectedAnnotations.has(ann.id)
                  return (
                    <li key={ann.id} className="mb-3">
                      <div className="group relative">
                        <button
                          type="button"
                          className={`w-full break-all rounded-md p-2 text-left shadow transition-all ${
                            isSelected
                              ? 'bg-blue-50 ring-2 ring-blue-500/50'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => onAnnotationClick(ann)}
                        >
                          <span className="font-semibold text-orange-500">
                            {ann.subject.annotationValue}
                          </span>
                          {' '}
                          &rarr;
                          {' '}
                          <span className="font-semibold text-blue-500">
                            {ann.predicate.annotationValue}
                          </span>
                          {' '}
                          &rarr;
                          {' '}
                          <span className="font-semibold text-green-500">
                            {ann.object.annotationValue}
                          </span>
                        </button>

                        {/* Selection checkbox - visible on hover or when selected */}
                        <div className={`absolute right-2 top-2 transition-opacity ${
                          isChecked || someSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={checked => onAnnotationSelect(ann.id, checked === true)}
                            onClick={e => e.stopPropagation()}
                            className="bg-white shadow-sm"
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </aside>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Annotations</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete
              {' '}
              <strong>
                {selectedAnnotations.size}
                {' '}
                selected annotation
                {selectedAnnotations.size > 1 ? 's' : ''}
              </strong>
              ?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
