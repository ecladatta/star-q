import type { CurrentAnnotation, DocumentAnnotation } from '@/types/types'
import {
  ChevronDownIcon,
  FilterIcon,
  Loader2Icon,
  TableIcon,
  TextIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { getAnnotationType } from '@/lib/utils'
import { QualifierSummary } from './qualifier-summary'
import { Badge } from './ui/badge'
import { Label } from './ui/label'

type SortOption = 'creation' | 'alphabetical' | 'position'

type EntityFilterState = 'any' | 'with' | 'without'

type FilterOptions = {
  types: {
    text: boolean
    table: boolean
    joint: boolean
  }
  entities: {
    subject: EntityFilterState
    predicate: EntityFilterState
    object: EntityFilterState
  }
}

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
  readOnly?: boolean
  mobileSheet?: { open: boolean, onOpenChange: (open: boolean) => void }
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
  readOnly = false,
  mobileSheet,
}: AnnotationsSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Initialize state from URL params
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const param = searchParams.get('sort')
    return (param === 'creation' || param === 'alphabetical' || param === 'position') ? param : 'position'
  })

  const [filters, setFilters] = useState<FilterOptions>(() => {
    const defaultFilters = {
      types: {
        text: true,
        table: true,
        joint: true,
      },
      entities: {
        subject: 'any' as EntityFilterState,
        predicate: 'any' as EntityFilterState,
        object: 'any' as EntityFilterState,
      },
    }

    // Try to read from URL params
    const typesParam = searchParams.get('types')
    const subjectParam = searchParams.get('subject')
    const predicateParam = searchParams.get('predicate')
    const objectParam = searchParams.get('object')

    if (typesParam || subjectParam || predicateParam || objectParam) {
      return {
        types: typesParam
          ? {
              text: typesParam.includes('text'),
              table: typesParam.includes('table'),
              joint: typesParam.includes('joint'),
            }
          : defaultFilters.types,
        entities: {
          subject: (subjectParam === 'any' || subjectParam === 'with' || subjectParam === 'without')
            ? subjectParam
            : defaultFilters.entities.subject,
          predicate: (predicateParam === 'any' || predicateParam === 'with' || predicateParam === 'without')
            ? predicateParam
            : defaultFilters.entities.predicate,
          object: (objectParam === 'any' || objectParam === 'with' || objectParam === 'without')
            ? objectParam
            : defaultFilters.entities.object,
        },
      }
    }

    return defaultFilters
  })

  // Update URL when filters or sort changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    // Update sort param
    if (sortOption !== 'position') {
      params.set('sort', sortOption)
    } else {
      params.delete('sort')
    }

    // Update type filters
    const activeTypes = Object.entries(filters.types)
      .filter(([_, value]) => value)
      .map(([key]) => key)

    if (activeTypes.length === 3) {
      params.delete('types')
    } else if (activeTypes.length > 0) {
      params.set('types', activeTypes.join(','))
    } else {
      params.delete('types')
    }

    // Update entity filters
    if (filters.entities.subject !== 'any') {
      params.set('subject', filters.entities.subject)
    } else {
      params.delete('subject')
    }

    if (filters.entities.predicate !== 'any') {
      params.set('predicate', filters.entities.predicate)
    } else {
      params.delete('predicate')
    }

    if (filters.entities.object !== 'any') {
      params.set('object', filters.entities.object)
    } else {
      params.delete('object')
    }

    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [sortOption, filters, pathname, router, searchParams])

  const filteredAndSortedAnnotations = useMemo(() => {
    // First filter annotations
    const filtered = annotations.filter((ann) => {
      const annotationType = getAnnotationType(ann)

      // Filter by annotation type
      if (!filters.types[annotationType]) {
        return false
      }

      // Filter by entity assignment (3-way toggle: any, with, without)
      const subjectHasEntity = !!ann.subject.entityLabel
      const predicateHasEntity = !!ann.predicate.entityLabel
      const objectHasEntity = !!ann.object.entityLabel

      // Subject filter
      if (filters.entities.subject === 'with' && !subjectHasEntity) {
        return false
      }
      if (filters.entities.subject === 'without' && subjectHasEntity) {
        return false
      }

      // Predicate filter
      if (filters.entities.predicate === 'with' && !predicateHasEntity) {
        return false
      }
      if (filters.entities.predicate === 'without' && predicateHasEntity) {
        return false
      }

      // Object filter
      if (filters.entities.object === 'with' && !objectHasEntity) {
        return false
      }
      if (filters.entities.object === 'without' && objectHasEntity) {
        return false
      }

      return true
    })

    // Then sort filtered annotations
    switch (sortOption) {
      case 'alphabetical':
        return filtered.sort((a, b) => {
          const aText = `${a.subject.annotationValue} ${a.predicate.annotationValue} ${a.object.annotationValue}`
          const bText = `${b.subject.annotationValue} ${b.predicate.annotationValue} ${b.object.annotationValue}`
          return aText.localeCompare(bText)
        })
      case 'position':
        return filtered.sort((a, b) => {
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
        return filtered // Keep original order (creation order)
    }
  }, [annotations, sortOption, filters])

  const allSelected
    = filteredAndSortedAnnotations.length > 0
      && filteredAndSortedAnnotations.every(ann => selectedAnnotations.has(ann.id))
  const someSelected = selectedAnnotations.size > 0

  const handleSelectAll = (checked: boolean) => {
    filteredAndSortedAnnotations.forEach((ann) => {
      onAnnotationSelect(ann.id, checked)
    })
  }

  const handleTypeFilterChange = (type: keyof FilterOptions['types'], checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: checked,
      },
    }))
  }

  const handleEntityFilterChange = (entity: keyof FilterOptions['entities'], state: EntityFilterState) => {
    setFilters(prev => ({
      ...prev,
      entities: {
        ...prev.entities,
        [entity]: state,
      },
    }))
  }

  const hasActiveFilters
    = !filters.types.text
      || !filters.types.table
      || !filters.types.joint
      || filters.entities.subject !== 'any'
      || filters.entities.predicate !== 'any'
      || filters.entities.object !== 'any'

  const resetFilters = () => {
    setFilters({
      types: {
        text: true,
        table: true,
        joint: true,
      },
      entities: {
        subject: 'any',
        predicate: 'any',
        object: 'any',
      },
    })
  }

  const handleDeleteClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = () => {
    setShowConfirmDialog(false)
    onBatchDelete()
  }

  const contentProps: SidebarContentProps = {
    annotations,
    filteredAndSortedAnnotations,
    showAnnotations,
    onShowAnnotationsChange,
    sortOption,
    setSortOption,
    filters,
    handleTypeFilterChange,
    handleEntityFilterChange,
    hasActiveFilters,
    resetFilters,
    allSelected,
    someSelected,
    handleSelectAll,
    selectedAnnotations,
    onAnnotationSelect,
    handleDeleteClick,
    isBatchDeleting,
    readOnly,
    currentAnnotation,
    onAnnotationClick,
  }

  return (
    <>
      <aside className="hidden w-[280px] shrink-0 border-l bg-background md:sticky md:top-0 md:block md:h-screen md:self-start">
        <SidebarContent {...contentProps} />
      </aside>

      {mobileSheet && (
        <Sheet open={mobileSheet.open} onOpenChange={mobileSheet.onOpenChange}>
          <SheetContent showCloseButton={false} className="w-[300px] sm:max-w-[300px]">
            <SheetTitle className="sr-only">Annotations</SheetTitle>
            <SidebarContent
              {...contentProps}
              onAnnotationClick={(annotation) => {
                onAnnotationClick(annotation)
                mobileSheet.onOpenChange(false)
              }}
              onClose={() => mobileSheet.onOpenChange(false)}
              alwaysShowCheckboxes
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-sm">
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

type SidebarContentProps = {
  annotations: DocumentAnnotation[]
  filteredAndSortedAnnotations: DocumentAnnotation[]
  showAnnotations: boolean
  onShowAnnotationsChange: (show: boolean) => void
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  filters: FilterOptions
  handleTypeFilterChange: (type: keyof FilterOptions['types'], checked: boolean) => void
  handleEntityFilterChange: (entity: keyof FilterOptions['entities'], state: EntityFilterState) => void
  hasActiveFilters: boolean
  resetFilters: () => void
  allSelected: boolean
  someSelected: boolean
  handleSelectAll: (checked: boolean) => void
  selectedAnnotations: Set<string>
  onAnnotationSelect: (annotationId: string, selected: boolean) => void
  handleDeleteClick: () => void
  isBatchDeleting: boolean
  readOnly: boolean
  currentAnnotation: CurrentAnnotation | null
  onAnnotationClick: (annotation: DocumentAnnotation) => void
  onClose?: () => void
  alwaysShowCheckboxes?: boolean
}

function SidebarContent({
  annotations,
  filteredAndSortedAnnotations,
  showAnnotations,
  onShowAnnotationsChange,
  sortOption,
  setSortOption,
  filters,
  handleTypeFilterChange,
  handleEntityFilterChange,
  hasActiveFilters,
  resetFilters,
  allSelected,
  someSelected,
  handleSelectAll,
  selectedAnnotations,
  onAnnotationSelect,
  handleDeleteClick,
  isBatchDeleting,
  readOnly,
  currentAnnotation,
  onAnnotationClick,
  onClose,
  alwaysShowCheckboxes = false,
}: SidebarContentProps) {
  const panelId = useId()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const annotationRef = useRef<Map<string, HTMLLIElement>>(new Map())

  // Auto-scroll to current annotation
  useEffect(() => {
    if (!currentAnnotation?.id)
      return

    const annotationElement = annotationRef.current.get(currentAnnotation.id)
    const scrollArea = scrollAreaRef.current

    if (annotationElement && scrollArea) {
      // Defer so the scroll runs after any URL navigation has settled
      const frame = requestAnimationFrame(() => {
        // Find the scroll container (the actual scrollable element inside ScrollArea)
        const scrollContainer = scrollArea.querySelector(
          '[data-radix-scroll-area-viewport]',
        )
        if (!scrollContainer)
          return

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
      })

      return () => cancelAnimationFrame(frame)
    }
  }, [currentAnnotation?.id, filteredAndSortedAnnotations])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[45px] shrink-0 items-center justify-between border-b px-3">
        <h2 className="text-xs font-medium text-muted-foreground">
          Annotations
        </h2>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="shrink-0">
            {filteredAndSortedAnnotations.length}
            {filteredAndSortedAnnotations.length !== annotations.length && (
              <span className="text-muted-foreground">
                {' '}
                /
                {' '}
                {annotations.length}
              </span>
            )}
          </Badge>
          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mr-1"
              onClick={onClose}
              aria-label="Close annotations panel"
            >
              <XIcon />
            </Button>
          )}
        </div>
      </div>

      {annotations.length > 0 && (
        <div className="shrink-0 space-y-3 border-b p-3">
          {/* Highlight toggle */}
          <div className="flex items-center gap-2 rounded-md bg-background">
            <Checkbox
              id={`${panelId}-show-annotations`}
              checked={showAnnotations}
              onCheckedChange={checked =>
                onShowAnnotationsChange(checked === true)}
            />
            <Label
              htmlFor={`${panelId}-show-annotations`}
              className="cursor-pointer text-sm font-medium"
            >
              <span>
                <u>H</u>
                ighlight in document
              </span>
            </Label>
          </div>

          {/* Sort and Filter controls */}
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-xs font-medium text-muted-foreground">
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
              <DropdownMenuContent align="end" className="w-50">
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

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={hasActiveFilters ? 'border-accent bg-accent/10' : ''}
                >
                  <FilterIcon className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px]" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Filters</h4>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="h-auto p-1 text-xs"
                      >
                        Reset
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                        Annotation Type
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${panelId}-filter-text`}
                            checked={filters.types.text}
                            onCheckedChange={checked =>
                              handleTypeFilterChange('text', checked === true)}
                          />
                          <Label
                            htmlFor={`${panelId}-filter-text`}
                            className="flex cursor-pointer items-center gap-1 text-sm font-normal"
                          >
                            <TextIcon className="size-3" />
                            Text
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${panelId}-filter-table`}
                            checked={filters.types.table}
                            onCheckedChange={checked =>
                              handleTypeFilterChange('table', checked === true)}
                          />
                          <Label
                            htmlFor={`${panelId}-filter-table`}
                            className="flex cursor-pointer items-center gap-1 text-sm font-normal"
                          >
                            <TableIcon className="size-3" />
                            Table
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${panelId}-filter-joint`}
                            checked={filters.types.joint}
                            onCheckedChange={checked =>
                              handleTypeFilterChange('joint', checked === true)}
                          />
                          <Label
                            htmlFor={`${panelId}-filter-joint`}
                            className="flex cursor-pointer items-center gap-1 text-sm font-normal"
                          >
                            <TextIcon className="size-3" />
                            <span className="text-xs">+</span>
                            <TableIcon className="size-3" />
                            Joint
                          </Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                        Entity Assignment
                      </Label>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`${panelId}-filter-subject`} className="text-xs text-muted-foreground">
                            Subject
                          </Label>
                          <Select
                            value={filters.entities.subject}
                            onValueChange={value =>
                              handleEntityFilterChange('subject', value as EntityFilterState)}
                          >
                            <SelectTrigger id={`${panelId}-filter-subject`} className="h-8 text-xs">
                              <SelectValue placeholder="Select filter..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any (show all)</SelectItem>
                              <SelectItem value="with">Must have entity</SelectItem>
                              <SelectItem value="without">Must not have entity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${panelId}-filter-predicate`} className="text-xs text-muted-foreground">
                            Predicate
                          </Label>
                          <Select
                            value={filters.entities.predicate}
                            onValueChange={value =>
                              handleEntityFilterChange('predicate', value as EntityFilterState)}
                          >
                            <SelectTrigger id={`${panelId}-filter-predicate`} className="h-8 text-xs">
                              <SelectValue placeholder="Select filter..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any (show all)</SelectItem>
                              <SelectItem value="with">Must have entity</SelectItem>
                              <SelectItem value="without">Must not have entity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`${panelId}-filter-object`} className="text-xs text-muted-foreground">
                            Object
                          </Label>
                          <Select
                            value={filters.entities.object}
                            onValueChange={value =>
                              handleEntityFilterChange('object', value as EntityFilterState)}
                          >
                            <SelectTrigger id={`${panelId}-filter-object`} className="h-8 text-xs">
                              <SelectValue placeholder="Select filter..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any (show all)</SelectItem>
                              <SelectItem value="with">Must have entity</SelectItem>
                              <SelectItem value="without">Must not have entity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selection controls */}
          {!readOnly && (
            <div className="flex items-center gap-2 rounded-md bg-background">
              <Checkbox
                id={`${panelId}-select-all`}
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                {...(someSelected && !allSelected
                  ? { 'data-state': 'indeterminate' }
                  : {})}
              />
              <Label
                htmlFor={`${panelId}-select-all`}
                className="cursor-pointer text-sm font-medium"
              >
                Select all
              </Label>
            </div>
          )}

          {/* Delete button */}
          {!readOnly && someSelected && (
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
      )}

      <div className={`relative min-h-0 flex-1 overflow-visible ${hasActiveFilters && annotations.length > 0 ? 'border border-accent/30' : ''}`}>
        {hasActiveFilters && annotations.length > 0 && (
          <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-4">
            <span className="rounded-sm border border-accent/30 bg-accent/10 px-2 py-[2px] text-[10px] font-medium text-accent">
              Filtered
            </span>
          </div>
        )}
        <ScrollArea className="size-full" ref={scrollAreaRef}>
          {filteredAndSortedAnnotations.length === 0
            ? (
                <div className="flex h-32 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                  {annotations.length === 0
                    ? 'Select text or table cells to start annotating'
                    : 'No annotations match the current filters'}
                </div>
              )
            : (
                <ul className="space-y-2 p-4">
                  {filteredAndSortedAnnotations.map((ann) => {
                    const isSelected = currentAnnotation?.id === ann.id
                    const isChecked = selectedAnnotations.has(ann.id)
                    const annotationType = getAnnotationType(ann)
                    return (
                      <li
                        key={ann.id}
                        ref={(el) => {
                          if (el) {
                            annotationRef.current.set(ann.id, el)
                          } else {
                            annotationRef.current.delete(ann.id)
                          }
                        }}
                      >
                        <div className="group relative">
                          <button
                            type="button"
                            className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? 'border-accent bg-accent/10 ring-1 ring-accent/20'
                                : 'border-border bg-card hover:border-accent/40'
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
                            <div className="flex flex-wrap items-center gap-1 overflow-hidden">
                              <span className="rounded-sm bg-subject-soft px-1.5 py-0.5 text-[11px] font-medium text-subject-fg">
                                {ann.subject.annotationValue}
                              </span>
                              <span className="text-muted-foreground">
                                &rarr;
                              </span>
                              <span className="rounded-sm bg-predicate-soft px-1.5 py-0.5 text-[11px] font-medium text-predicate-fg">
                                {ann.predicate.annotationValue}
                              </span>
                              <span className="text-muted-foreground">
                                &rarr;
                              </span>
                              <span className="rounded-sm bg-object-soft px-1.5 py-0.5 text-[11px] font-medium text-object-fg">
                                {ann.object.annotationValue}
                              </span>
                            </div>
                            <QualifierSummary qualifiers={ann.qualifiers} className="mt-2 pt-2" />
                          </button>

                          {/* Selection checkbox - visible on hover or when selected */}
                          {!readOnly && (
                            <div
                              className={`absolute top-2 right-2 transition-opacity ${
                                isChecked || someSelected || alwaysShowCheckboxes
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={checked =>
                                  onAnnotationSelect(ann.id, checked === true)}
                                onClick={e => e.stopPropagation()}
                                className="bg-background"
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
        </ScrollArea>
      </div>
    </div>
  )
}
