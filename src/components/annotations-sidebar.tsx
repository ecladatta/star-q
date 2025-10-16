import type { CurrentAnnotation, DocumentAnnotation } from '@/types/types'
import {
  ChevronDownIcon,
  Loader2Icon,
  TableIcon,
  TextIcon,
  Trash2Icon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getAnnotationType } from '@/lib/utils'
import { Badge } from './ui/badge'
import { Label } from './ui/label'

type SortOption = 'creation' | 'alphabetical' | 'position'

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
  const [sortOption, setSortOption] = useState<SortOption>('position')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const annotationRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  const sortedAnnotations = useMemo(() => {
    const sorted = [...annotations]

    switch (sortOption) {
      case 'alphabetical':
        return sorted.sort((a, b) => {
          const aText = `${a.subject.annotationValue} ${a.predicate.annotationValue} ${a.object.annotationValue}`
          const bText = `${b.subject.annotationValue} ${b.predicate.annotationValue} ${b.object.annotationValue}`
          return aText.localeCompare(bText)
        })
      case 'position':
        return sorted.sort((a, b) => {
          // Sort by element index first
          if (a.subject.elementIndex !== b.subject.elementIndex) {
            return a.subject.elementIndex - b.subject.elementIndex
          }

          // Then by row and cell (if table)
          if (
            a.subject.annotationType === 'table'
            && b.subject.annotationType === 'table'
          ) {
            const aRow = a.subject.annotationRow ?? 0
            const bRow = b.subject.annotationRow ?? 0
            if (aRow !== bRow) {
              return aRow - bRow
            }

            const aCell = a.subject.annotationCell ?? 0
            const bCell = b.subject.annotationCell ?? 0
            if (aCell !== bCell) {
              return aCell - bCell
            }
          }

          // Finally by start position
          return a.subject.annotationStart - b.subject.annotationStart
        })
      case 'creation':
      default:
        return sorted // Keep original order (creation order)
    }
  }, [annotations, sortOption])

  const allSelected
    = sortedAnnotations.length > 0
      && sortedAnnotations.every(ann => selectedAnnotations.has(ann.id))
  const someSelected = selectedAnnotations.size > 0

  const handleSelectAll = (checked: boolean) => {
    sortedAnnotations.forEach((ann) => {
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

  // Auto-scroll to current annotation
  useEffect(() => {
    if (!currentAnnotation?.id)
      return

    const annotationElement = annotationRefs.current.get(currentAnnotation.id)
    const scrollArea = scrollAreaRef.current

    if (annotationElement && scrollArea) {
      // Find the scroll container (the actual scrollable element inside ScrollArea)
      const scrollContainer = scrollArea.querySelector(
        '[data-radix-scroll-area-viewport]',
      )

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect()
        const elementRect = annotationElement.getBoundingClientRect()

        // Check if element is already visible
        const isVisible
          = elementRect.top >= containerRect.top
            && elementRect.bottom <= containerRect.bottom

        if (!isVisible) {
          // Calculate the scroll position to center the element
          const scrollTop = scrollContainer.scrollTop
          const elementOffsetTop
            = elementRect.top - containerRect.top + scrollTop
          const containerHeight = containerRect.height
          const elementHeight = elementRect.height

          const targetScrollTop
            = elementOffsetTop - containerHeight / 2 + elementHeight / 2

          scrollContainer.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth',
          })
        }
      }
    }
  }, [currentAnnotation?.id, sortedAnnotations])

  if (annotations.length === 0) {
    return null
  }

  return (
    <>
      <aside className="fixed right-0 top-0 hidden h-screen w-[280px] border-l bg-background pt-16 md:block">
        <div className="flex h-full flex-col">
          <div className="border-b bg-muted/30 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              Annotations
              <Badge variant="secondary" className="ml-auto">
                {annotations.length}
              </Badge>
            </h2>

            <div className="space-y-3">
              {/* Highlight toggle */}
              <div className="flex items-center gap-2 rounded-lg bg-background p-2 shadow-sm">
                <Checkbox
                  id="show-annotations"
                  checked={showAnnotations}
                  onCheckedChange={checked =>
                    onShowAnnotationsChange(checked === true)}
                />
                <Label
                  htmlFor="show-annotations"
                  className="cursor-pointer text-sm font-medium"
                >
                  <span>
                    <u>H</u>
                    ighlight in document
                  </span>
                </Label>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sort by
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-between truncate"
                      size="sm"
                      style={{ minWidth: 0 }}
                    >
                      <span className="truncate text-sm">
                        {sortOption === 'creation' && 'Creation order'}
                        {sortOption === 'alphabetical' && 'Alphabetical'}
                        {sortOption === 'position' && 'Position in document'}
                      </span>
                      <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem onClick={() => setSortOption('creation')}>
                      Creation order
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortOption('alphabetical')}
                    >
                      Alphabetical
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption('position')}>
                      Position in document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Selection controls */}
              <div className="flex items-center gap-2 rounded-lg bg-background p-2 shadow-sm">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  {...(someSelected && !allSelected
                    ? { 'data-state': 'indeterminate' }
                    : {})}
                />
                <Label
                  htmlFor="select-all"
                  className="cursor-pointer text-sm font-medium"
                >
                  Select all
                </Label>
              </div>

              {/* Delete button */}
              {someSelected && (
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
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="size-full" ref={scrollAreaRef}>
              <ul className="space-y-2 p-4">
                {sortedAnnotations.map((ann) => {
                  const isSelected = currentAnnotation?.id === ann.id
                  const isChecked = selectedAnnotations.has(ann.id)
                  const annotationType = getAnnotationType(ann)
                  return (
                    <li
                      key={ann.id}
                      ref={(el) => {
                        if (el) {
                          annotationRefs.current.set(ann.id, el)
                        } else {
                          annotationRefs.current.delete(ann.id)
                        }
                      }}
                    >
                      <div className="group relative">
                        <button
                          type="button"
                          className={`w-full rounded-lg border p-3 text-left transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20'
                              : 'border-border bg-card hover:border-blue-300 hover:shadow-sm'
                          }`}
                          onClick={() => onAnnotationClick(ann)}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {annotationType === 'joint' && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 text-xs font-medium"
                              >
                                <TextIcon className="size-3" />
                                +
                                <TableIcon className="size-3" />
                                <span className="ml-0.5">Joint</span>
                              </Badge>
                            )}
                            {annotationType === 'table' && (
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 text-xs font-medium"
                              >
                                <TableIcon className="size-3" />
                                <span className="ml-0.5">Table</span>
                              </Badge>
                            )}
                            {annotationType === 'text' && (
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 text-xs font-medium"
                              >
                                <TextIcon className="size-3" />
                                <span className="ml-0.5">Text</span>
                              </Badge>
                            )}
                          </div>
                          <div className="break-words text-sm leading-relaxed">
                            <span className="font-semibold text-orange-600">
                              {ann.subject.annotationValue}
                            </span>
                            {' '}
                            <span className="text-muted-foreground">
                              &rarr;
                            </span>
                            {' '}
                            <span className="font-semibold text-blue-600">
                              {ann.predicate.annotationValue}
                            </span>
                            {' '}
                            <span className="text-muted-foreground">
                              &rarr;
                            </span>
                            {' '}
                            <span className="font-semibold text-green-600">
                              {ann.object.annotationValue}
                            </span>
                          </div>
                        </button>

                        {/* Selection checkbox - visible on hover or when selected */}
                        <div
                          className={`absolute right-2 top-2 transition-opacity ${
                            isChecked || someSelected
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={checked =>
                              onAnnotationSelect(ann.id, checked === true)}
                            onClick={e => e.stopPropagation()}
                            className="bg-background shadow-sm"
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
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
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
