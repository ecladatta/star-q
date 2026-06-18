import type { CurrentAnnotation, DocumentAnnotation } from '@/types/types'
import {
  ChevronDownIcon,
  FilterIcon,
  Loader2Icon,
  TableIcon,
  TextIcon,
  Trash2Icon,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { getAnnotationComponentDisplayText, getAnnotationComponentTitle } from '@/lib/annotation-roles'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { getAnnotationType } from '@/lib/utils'
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

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const annotationRefs = useRef<Map<string, HTMLLIElement>>(new Map())

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
  }, [currentAnnotation?.id, filteredAndSortedAnnotations])

  if (annotations.length === 0) {
    return null
  }

  return (
    <>
      <aside className="fixed top-0 right-0 hidden h-screen w-[280px] border-l bg-background pt-12 md:block">
        <div className="flex h-full flex-col">
          <div className="border-b bg-muted/30 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              Annotations
              <Badge variant="secondary" className="ml-auto">
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
            </h2>

            <div className="space-y-3">
              {/* Highlight toggle */}
              <div className="flex items-center gap-2 rounded-lg bg-background p-2 shadow-xs">
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

              {/* Sort and Filter controls */}
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={hasActiveFilters ? 'border-blue-500 bg-blue-50' : ''}
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
                          <Label className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Annotation Type
                          </Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="filter-text"
                                checked={filters.types.text}
                                onCheckedChange={checked =>
                                  handleTypeFilterChange('text', checked === true)}
                              />
                              <Label
                                htmlFor="filter-text"
                                className="flex cursor-pointer items-center gap-1 text-sm font-normal"
                              >
                                <TextIcon className="size-3" />
                                Text
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="filter-table"
                                checked={filters.types.table}
                                onCheckedChange={checked =>
                                  handleTypeFilterChange('table', checked === true)}
                              />
                              <Label
                                htmlFor="filter-table"
                                className="flex cursor-pointer items-center gap-1 text-sm font-normal"
                              >
                                <TableIcon className="size-3" />
                                Table
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="filter-joint"
                                checked={filters.types.joint}
                                onCheckedChange={checked =>
                                  handleTypeFilterChange('joint', checked === true)}
                              />
                              <Label
                                htmlFor="filter-joint"
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
                          <Label className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Entity Assignment
                          </Label>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="filter-subject" className="text-xs text-muted-foreground">
                                Subject
                              </Label>
                              <Select
                                value={filters.entities.subject}
                                onValueChange={value =>
                                  handleEntityFilterChange('subject', value as EntityFilterState)}
                              >
                                <SelectTrigger id="filter-subject" className="h-8 text-xs">
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
                              <Label htmlFor="filter-predicate" className="text-xs text-muted-foreground">
                                Predicate
                              </Label>
                              <Select
                                value={filters.entities.predicate}
                                onValueChange={value =>
                                  handleEntityFilterChange('predicate', value as EntityFilterState)}
                              >
                                <SelectTrigger id="filter-predicate" className="h-8 text-xs">
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
                              <Label htmlFor="filter-object" className="text-xs text-muted-foreground">
                                Object
                              </Label>
                              <Select
                                value={filters.entities.object}
                                onValueChange={value =>
                                  handleEntityFilterChange('object', value as EntityFilterState)}
                              >
                                <SelectTrigger id="filter-object" className="h-8 text-xs">
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
              <div className="flex items-center gap-2 rounded-lg bg-background p-2 shadow-xs">
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

          <div className={`relative min-h-0 flex-1 overflow-visible ${hasActiveFilters ? 'border border-blue-500/30' : ''}`}>
            {hasActiveFilters && (
              <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-4">
                <span className="rounded-sm border border-blue-100 bg-blue-50 px-2 py-[2px] text-[10px] font-medium text-blue-600 shadow-xs">
                  Filtered
                </span>
              </div>
            )}
            <ScrollArea className="size-full" ref={scrollAreaRef}>
              {filteredAndSortedAnnotations.length === 0
                ? (
                    <div className="flex h-32 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                      No annotations match the current filters
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
                                    : 'border-border bg-card hover:border-blue-300 hover:shadow-xs'
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
                                <div className="overflow-hidden text-sm/relaxed wrap-anywhere">
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
                                {ann.qualifiers.length > 0 && (
                                  <div className="mt-2 border-t border-dashed pt-2">
                                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                      <span>Qualifiers</span>
                                      <span>{ann.qualifiers.length}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {ann.qualifiers.map(qualifier => (
                                        <div
                                          key={qualifier.id}
                                          className="flex min-w-0 items-center gap-1 rounded-md bg-muted/60 px-1.5 py-1 text-[11px] leading-tight"
                                        >
                                          <span
                                            className="min-w-0 flex-1 truncate rounded-sm px-1.5 py-0.5 font-medium text-slate-800"
                                            style={{ backgroundColor: TYPE_TO_COLOR['qualifier-predicate'] }}
                                            title={getAnnotationComponentTitle(qualifier.predicate)}
                                          >
                                            {getAnnotationComponentDisplayText(qualifier.predicate)}
                                          </span>
                                          <span className="shrink-0 text-muted-foreground">
                                            &rarr;
                                          </span>
                                          <span
                                            className="min-w-0 flex-1 truncate rounded-sm px-1.5 py-0.5 font-medium text-slate-800"
                                            style={{ backgroundColor: TYPE_TO_COLOR['qualifier-value'] }}
                                            title={getAnnotationComponentTitle(qualifier.value)}
                                          >
                                            {getAnnotationComponentDisplayText(qualifier.value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </button>

                              {/* Selection checkbox - visible on hover or when selected */}
                              <div
                                className={`absolute top-2 right-2 transition-opacity ${
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
                                  className="bg-background shadow-xs"
                                />
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
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
