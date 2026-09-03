import type { ReactNode } from 'react'
import type {
  ConstraintEntityCheck,
  ConstraintSide,
  EntityCandidateClassification,
  PropertyConstraints,
} from '@/lib/wikidata-constraints'
import type {
  AnnotationComponentRole,
  Entity,
  EntityDatatype,
  EntityType,
} from '@/types/types'
import {
  AtSignIcon,
  BinaryIcon,
  Calendar1Icon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CalendarRangeIcon,
  CaseSensitiveIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  Clock3Icon,
  ClockIcon,
  FileCodeIcon,
  FilterIcon,
  GlobeIcon,
  HourglassIcon,
  LanguagesIcon,
  TextIcon,
  TimerIcon,
  ToggleLeftIcon,
  TriangleAlertIcon,
  TypeIcon,
  VariableIcon,
  WholeWordIcon,
  XIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import WBK from 'wikibase-sdk'
import {
  addCorpusCustomEntity,
  searchCorpusCustomEntities,
} from '@/actions/corpus/corpusActions'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { entityTypeForComponentRole } from '@/lib/annotation-roles'
import { ENTITY_DATATYPE_GROUPS, ENTITY_DATATYPE_LABELS } from '@/lib/datatypes'
import { cn } from '@/lib/utils'
import { WIKIDATA_ITEM_PATTERN, WIKIDATA_PROPERTY_PATTERN } from '@/lib/wikidata-constraints'
import { classifyEntityCandidatesViaWikidata, classifyPredicateCandidatesViaWikidata, withRequestTimeout } from '@/lib/wikidata-sparql'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
})

const SEARCH_DEBOUNCE_MS = 200

async function searchEntities(
  type: EntityType,
  searchTerm: string,
  corpusId?: string,
  limit = 5,
): Promise<Entity[]> {
  // Search both Wikidata and custom entities in parallel
  const promises: Promise<Entity[]>[] = []

  // Wikidata search
  const wikidataPromise = (async () => {
    try {
      const url = wdk.searchEntities({
        search: searchTerm,
        language: 'en',
        limit,
        type: type === 'predicate' ? 'property' : 'item',
      })

      const data = await withRequestTimeout(async (signal) => {
        const response = await fetch(url, { signal })
        return response.json()
      })
      return data.search.map((result: any) => ({
        label: result.label,
        value: result.id,
        custom: false,
        customId: null,
        datatype: null,
        type,
        description: result.description || null,
      }))
    } catch (error) {
      console.error('Wikidata search error:', error)
      return []
    }
  })()

  promises.push(wikidataPromise)

  // Custom entities search
  if (corpusId) {
    const customPromise = (async () => {
      try {
        const results = await searchCorpusCustomEntities(
          corpusId,
          searchTerm,
          type,
        )
        return results.map(entity => ({
          label: entity.label,
          value: entity.value,
          custom: true,
          customId: entity.id,
          datatype: entity.datatype,
          type,
        }))
      } catch (error) {
        console.error('Custom entities search error:', error)
        return []
      }
    })()

    promises.push(customPromise)
  }

  const results = await Promise.all(promises)
  return results.flat()
}

function NumberIcon({ value }: { value: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-5"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <text
        x="16"
        y="22"
        fontSize={value.length > 3 ? 10 : 14}
        fontWeight="bold"
        textAnchor="middle"
      >
        {value}
      </text>
    </svg>
  )
}

const TYPES_ICONS: Record<EntityDatatype, ReactNode> = {
  string: <TypeIcon className="size-5" />,
  integer: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-5"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <text x="3" y="22" fontSize="20" fontWeight="bold">
        42
      </text>
    </svg>
  ),
  decimal: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-5"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <text x="0" y="22" fontSize="16" fontWeight="bold">
        3.14
      </text>
    </svg>
  ),
  double: <NumberIcon value="1.5e3" />,
  float: <NumberIcon value="0.5" />,
  boolean: <ToggleLeftIcon className="size-5" />,
  date: <CalendarIcon className="size-5" />,
  time: <ClockIcon className="size-5" />,
  dateTime: <CalendarClockIcon className="size-5" />,
  dateTimeStamp: <CalendarCheckIcon className="size-5" />,
  gYear: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-5"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <text x="5" y="14" fontSize="18" fontWeight="bold">
        {new Date().getFullYear().toString().slice(0, 2)}
      </text>
      <text x="5" y="30" fontSize="18" fontWeight="bold">
        {new Date().getFullYear().toString().slice(-2)}
      </text>
    </svg>
  ),
  gMonth: <Calendar1Icon className="size-5" />,
  gDay: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 276.338 276.338"
      xmlSpace="preserve"
      className="size-5"
    >
      <path d="M267.207 99.838V58.075c0-21.569-19.036-39.141-42.689-39.748v24.636c0 13.999-11.388 25.387-25.384 25.387-13.997 0-25.385-11.388-25.385-25.387V18.265h-71.98v24.698c0 13.999-11.388 25.387-25.386 25.387-13.997 0-25.384-11.388-25.384-25.387V18.36c-23.262.985-41.868 18.396-41.868 39.71v174.336c0 24.218 19.709 43.932 43.929 43.932h170.216c24.217 0 43.927-19.714 43.927-43.932V99.838h.004zM248.09 232.411c0 13.684-11.131 24.811-24.814 24.811H53.065c-13.682 0-24.812-11.127-24.812-24.811V99.838H248.09v132.573z" />
      <path d="M65.339 11.049v31.913c0 6.104 4.945 11.049 11.049 11.049 6.102 0 11.049-4.945 11.049-11.049V11.049C87.438 4.945 82.491 0 76.389 0c-6.105.005-11.05 4.95-11.05 11.049zM199.137.005c-6.104 0-11.051 4.945-11.051 11.049v31.913c0 6.104 4.946 11.049 11.051 11.049s11.052-4.945 11.052-11.049V11.049C210.18 4.95 205.238.005 199.137.005zM106.19 231.87c12.463 0 21.875-3.481 28.238-10.445 6.352-6.963 9.535-15.037 9.535-24.222 0-8.737-2.719-15.626-8.163-20.666-1.477-1.354-2.814-2.437-4.009-3.239-2.188-1.475-2.352-2.529-.292-4.125 1.157-.901 2.294-1.988 3.407-3.268 3.794-4.392 5.691-9.782 5.691-16.176 0-9.026-3.171-16.23-9.532-21.597s-14.725-8.048-25.095-8.048c-5.582 0-10.296.674-14.137 2.021-3.839 1.349-7.15 3.292-9.945 5.841-3.739 3.594-6.48 7.512-8.23 11.759a52.313 52.313 0 0 0-2.39 10.584c-.315 2.623 1.769 4.761 4.406 4.761H86.03c2.64 0 4.674-2.156 5.057-4.77.465-3.174 1.505-5.853 3.116-8.032 2.366-3.192 6.065-4.793 11.093-4.793 4.383 0 7.775 1.297 10.193 3.893 2.408 2.595 3.619 5.964 3.619 10.108 0 6.395-2.366 10.637-7.089 12.732-2.053.933-5.29 1.544-9.696 1.838-2.632.168-4.774 2.324-4.774 4.957v5.717c0 2.637 2.147 4.756 4.784 4.9 4.669.248 8.254.878 10.744 1.899 5.773 2.399 8.66 7.169 8.66 14.3 0 5.396-1.559 9.521-4.669 12.396-3.11 2.87-6.763 4.303-10.944 4.303-6.823 0-11.532-2.618-14.118-7.859-.845-1.731-1.433-3.733-1.767-6.011-.383-2.614-2.462-4.771-5.106-4.771H73.726c-2.639 0-4.718 2.138-4.427 4.761.714 6.478 2.343 11.878 4.879 16.194 5.979 10.041 16.653 15.058 32.012 15.058zM165.582 154.303h15.976a4.779 4.779 0 0 1 4.778 4.779v65.312a4.783 4.783 0 0 0 4.779 4.779h12.308a4.782 4.782 0 0 0 4.778-4.779v-99.005a4.782 4.782 0 0 0-4.778-4.779h-8.266c-2.637 0-4.812.994-5.064 2.188-.135.63-.312 1.349-.541 2.151-.942 3.244-2.343 5.839-4.182 7.785-2.688 2.842-6.175 4.739-10.454 5.691-1.997.448-5.115.808-9.344 1.092-2.632.168-4.77 2.399-4.77 5.031v4.966a4.788 4.788 0 0 0 4.78 4.789z" />
    </svg>
  ),
  gYearMonth: <CalendarRangeIcon className="size-5" />,
  gMonthDay: <CalendarDaysIcon className="size-5" />,
  duration: <HourglassIcon className="size-5" />,
  yearMonthDuration: <TimerIcon className="size-5" />,
  dayTimeDuration: <Clock3Icon className="size-5" />,
  byte: <NumberIcon value="8" />,
  short: <NumberIcon value="16" />,
  int: <NumberIcon value="32" />,
  long: <NumberIcon value="64" />,
  unsignedByte: <NumberIcon value="u8" />,
  unsignedShort: <NumberIcon value="u16" />,
  unsignedInt: <NumberIcon value="u32" />,
  unsignedLong: <NumberIcon value="u64" />,
  positiveInteger: <NumberIcon value=">0" />,
  nonNegativeInteger: <NumberIcon value="≥0" />,
  negativeInteger: <NumberIcon value="<0" />,
  nonPositiveInteger: <NumberIcon value="≤0" />,
  hexBinary: <BinaryIcon className="size-5" />,
  base64Binary: <FileCodeIcon className="size-5" />,
  anyURI: <GlobeIcon className="size-5" />,
  language: <LanguagesIcon className="size-5" />,
  normalizedString: <TextIcon className="size-5" />,
  token: <WholeWordIcon className="size-5" />,
  NMTOKEN: <CaseSensitiveIcon className="size-5" />,
  Name: <VariableIcon className="size-5" />,
  NCName: <AtSignIcon className="size-5" />,
}

function getEntityOptionKey(
  entity: Entity,
  source: 'current' | 'custom' | 'wikidata',
  index: number,
): string {
  if (entity.custom && entity.customId) {
    return `${source}:${entity.customId}`
  }

  return `${source}:${entity.value}:${index}`
}

function getEntityOptionValue(
  entity: Entity,
  source: 'current' | 'custom' | 'wikidata',
  index: number,
): string {
  if (entity.custom && entity.customId) {
    return `${source}:${entity.customId}`
  }

  return `${source}:${entity.value}:${index}`
}

function isSelectedEntity(
  currentValue: Entity | null,
  candidate: Entity,
): boolean {
  if (!currentValue) {
    return false
  }
  if (currentValue.custom || candidate.custom) {
    return (
      currentValue.custom === candidate.custom
      && currentValue.customId === candidate.customId
    )
  }

  return currentValue.value === candidate.value
}

function formatFilteredSides(sides: ConstraintSide[]): string {
  if (sides.length === 1) {
    return sides[0]
  }
  return 'domain or range'
}

export function EntitySelector({
  type,
  value,
  onValueChange,
  text,
  corpusId,
  constraints,
  constraintSide,
  constraintPropertyLabel,
  constraintEntityChecks,
  filteringEnabled = false,
}: {
  type: AnnotationComponentRole
  value: Entity | null
  onValueChange: (arg0: Entity | null) => any
  text?: string
  corpusId?: string
  constraints?: PropertyConstraints | null
  constraintSide?: ConstraintSide | null
  constraintPropertyLabel?: string | null
  constraintEntityChecks?: Array<ConstraintEntityCheck & { label: string }> | null
  filteringEnabled?: boolean
}) {
  const entityType = entityTypeForComponentRole(type)
  const [open, setOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Entity[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [prevSelectorText, setPrevSelectorText] = useState(text)
  if (prevSelectorText !== text) {
    setPrevSelectorText(text)
    setSearchTerm('')
  }
  const [isSearching, setIsSearching] = useState(false)
  const [classification, setClassification] = useState<EntityCandidateClassification | null>(null)
  const [classifiedCandidates, setClassifiedCandidates] = useState<string[]>([])
  const [showAllResults, setShowAllResults] = useState(false)

  const searchSeqRef = useRef(0)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const candidatePattern = entityType === 'predicate' ? WIKIDATA_PROPERTY_PATTERN : WIKIDATA_ITEM_PATTERN
  const searchLimit = constraintEntityChecks?.length ? 20 : 5

  const runSearch = useCallback(async (term: string, seq: number) => {
    try {
      const results = await searchEntities(entityType, term, corpusId, searchLimit)
      if (seq === searchSeqRef.current) {
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Search error:', error)
      if (seq === searchSeqRef.current) {
        setSearchResults([])
      }
    } finally {
      if (seq === searchSeqRef.current) {
        setIsSearching(false)
      }
    }
  }, [entityType, corpusId, searchLimit])

  const currentCandidates = useMemo(() => Array.from(new Set([
    ...searchResults
      .filter(result => !result.custom && candidatePattern.test(result.value))
      .map(result => result.value),
    ...(value && !value.custom && value.value && candidatePattern.test(value.value)
      ? [value.value]
      : []),
  ])), [searchResults, value, candidatePattern])

  const hasEntityChecks = Boolean(constraintEntityChecks && constraintEntityChecks.length > 0)
  const hasPropertyConstraints = Boolean(constraints && constraintSide)
  const classificationEligible = hasEntityChecks || hasPropertyConstraints

  const activeClassification = useMemo(() => {
    if (!classificationEligible) {
      return null
    }
    if (!classification) {
      return null
    }
    const sameCandidateSet = classifiedCandidates.length === currentCandidates.length
      && classifiedCandidates.every((id, index) => id === currentCandidates[index])
    return sameCandidateSet ? classification : null
  }, [classification, classifiedCandidates, currentCandidates, classificationEligible])

  useEffect(() => {
    if (text && !value?.value) {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
      const seq = ++searchSeqRef.current
      searchTimerRef.current = setTimeout(() => {
        setIsSearching(true)
        runSearch(text, seq)
      }, SEARCH_DEBOUNCE_MS)
    }
  }, [text, entityType, value, corpusId, searchLimit, runSearch])

  useEffect(() => () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Classify candidates against Wikidata domain/range constraints
  useEffect(() => {
    if (!classificationEligible || currentCandidates.length === 0) {
      return
    }

    let cancelled = false
    const promise = hasEntityChecks
      ? classifyPredicateCandidatesViaWikidata(currentCandidates, constraintEntityChecks!)
      : classifyEntityCandidatesViaWikidata(currentCandidates, constraints!, constraintSide!)
    promise
      .then((result) => {
        if (!cancelled) {
          setClassification(result)
          setClassifiedCandidates(currentCandidates)
          setShowAllResults(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClassification(null)
          setClassifiedCandidates([])
          setShowAllResults(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentCandidates, constraints, constraintSide, constraintEntityChecks, classificationEligible, hasEntityChecks])

  const handleSearch = (term: string) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    if (!term.trim()) {
      searchSeqRef.current += 1
      setSearchResults([])
      setIsSearching(false)
      return
    }
    const seq = ++searchSeqRef.current
    setIsSearching(true)
    searchTimerRef.current = setTimeout(() => {
      runSearch(term, seq)
    }, SEARCH_DEBOUNCE_MS)
  }

  // Separate custom and Wikidata entities, honoring constraint filtering when active
  const resultStatus = useMemo(() => {
    if (!activeClassification) {
      return new Map<string, 'member' | 'unverifiable' | ConstraintSide[]>()
    }
    const statusMap = new Map<string, 'member' | 'unverifiable' | ConstraintSide[]>()
    for (const id of activeClassification.members) {
      statusMap.set(id, 'member')
    }
    for (const id of activeClassification.unverifiable) {
      statusMap.set(id, 'unverifiable')
    }
    for (const { id, sides } of activeClassification.filteredOut) {
      statusMap.set(id, sides)
    }
    return statusMap
  }, [activeClassification])

  const visibleResults = useMemo(() => {
    if (!filteringEnabled || !activeClassification || showAllResults) {
      return searchResults
    }
    const allowed = new Set([...activeClassification.members, ...activeClassification.unverifiable])
    return searchResults.filter(result => result.custom || allowed.has(result.value))
  }, [searchResults, activeClassification, showAllResults, filteringEnabled])

  const sortedResults = useMemo(() => {
    if (!activeClassification) {
      return visibleResults
    }
    const order = new Map<string, number>()
    activeClassification.members.forEach((id, index) => order.set(id, index))
    activeClassification.unverifiable.forEach((id, index) => order.set(id, activeClassification.members.length + index))
    const rank = (result: Entity) => {
      if (result.custom) {
        return Number.MAX_SAFE_INTEGER
      }
      return order.get(result.value) ?? Number.MAX_SAFE_INTEGER - 1
    }
    return [...visibleResults].sort((a, b) => rank(a) - rank(b))
  }, [visibleResults, activeClassification])

  const customEntities = sortedResults.filter(entity => entity.custom)
  const wikidataEntities = sortedResults.filter(entity => !entity.custom)
  const filteredOutCount = activeClassification?.filteredOut.length ?? 0
  const hasConstraintFilter = Boolean(
    (constraintEntityChecks && constraintEntityChecks.length > 0)
    || (constraints && constraintSide),
  )
  const filteringActive = Boolean(
    filteringEnabled
    && hasConstraintFilter
    && activeClassification
    && filteredOutCount > 0,
  )
  const constraintNoun = entityType === 'predicate' ? 'predicates' : 'entities'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex w-full min-w-0 items-center gap-1">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-0 flex-1 shrink justify-between truncate text-left"
          >
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {value && Array.isArray(resultStatus.get(value.value)) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0">
                      <TriangleAlertIcon className="size-4 text-warning-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Doesn&apos;t match
                    {' '}
                    {formatFilteredSides(resultStatus.get(value.value) as ConstraintSide[])}
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="flex-1 truncate">
                {value
                  ? (
                      value.label
                    )
                  : (
                      <span className="text-muted-foreground">Search entity...</span>
                    )}
              </div>
            </div>
            <ChevronsUpDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value?.custom && (
          <Select
            value={value.datatype || undefined}
            onValueChange={(datatype: EntityDatatype) => {
              onValueChange({ ...value, datatype })
            }}
          >
            <SelectTrigger
              aria-label="Entity datatype"
              className="size-8 shrink-0 justify-center p-0 [&>svg]:hidden"
            >
              <SelectValue placeholder={<FilterIcon className="size-5" />}>
                {value.datatype && TYPES_ICONS[value.datatype]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ENTITY_DATATYPE_GROUPS.map(group => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.types.map(datatype => (
                    <SelectItem key={datatype} value={datatype}>
                      <div className="flex items-center gap-2">
                        {TYPES_ICONS[datatype]}
                        {' '}
                        {ENTITY_DATATYPE_LABELS[datatype]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <PopoverContent className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search entity..."
            className="flex-1"
            onValueChange={(value) => {
              setSearchTerm(value)
              handleSearch(value)
            }}
          />
          <CommandList className={cn('text-[13px]', isSearching ? 'opacity-50' : '')}>
            <CommandEmpty>
              {filteringActive && !showAllResults
                ? (constraintEntityChecks?.length
                    ? `No ${constraintNoun} match the selected entities' constraints. Use "Show all results" to see everything.`
                    : 'No entities match the property constraints. Use "Show all results" to see everything.')
                : 'No entities found.'}
            </CommandEmpty>
            {filteringActive && !showAllResults && (
              <div className="border-b px-3 py-2 text-[11px] text-muted-foreground">
                <>
                  Filtered to match
                  {' '}
                  the
                  {' '}
                  {constraintSide === 'domain' ? 'domain' : 'range'}
                  {' '}
                  of
                  {' '}
                  {constraintPropertyLabel
                    ? (
                        <span className="font-semibold">
                          {constraintPropertyLabel}
                        </span>
                      )
                    : (
                        <span>the selected property</span>
                      )}
                </>
              </div>
            )}
            {value && (
              <>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onValueChange(null)
                      setOpen(false)
                    }}
                  >
                    <XIcon className="size-3.5" />
                    <span>Clear entity</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Current value if not in search results */}
            {value
              && !searchResults.some(entity =>
                isSelectedEntity(value, entity),
              ) && (
              <CommandGroup>
                <CommandItem
                  key={getEntityOptionKey(value, 'current', 0)}
                  value={getEntityOptionValue(value, 'current', 0)}
                  onSelect={() => {
                    onValueChange(value)
                    setOpen(false)
                  }}
                  className="items-start rounded-none border-b py-2"
                >
                  <CheckIcon className="size-3.5 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="min-w-0 leading-5">
                      <span>{value.label}</span>
                      <span
                        className="ml-2 text-xs text-muted-foreground"
                        title={value.value}
                      >
                        (
                        {value.value}
                        )
                      </span>
                    </div>
                    {value.description && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {value.description}
                      </span>
                    )}
                    {resultStatus.get(value.value) === 'unverifiable' && (
                      <Badge variant="secondary">
                        type unknown
                      </Badge>
                    )}
                    {Array.isArray(resultStatus.get(value.value)) && (
                      <Badge variant="warning">
                        <TriangleAlertIcon />
                        doesn&apos;t match
                        {' '}
                        {formatFilteredSides(resultStatus.get(value.value) as ConstraintSide[])}
                      </Badge>
                    )}
                  </div>
                  {value.custom
                    ? (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Corpus
                        </span>
                      )
                    : (
                        <Link
                          href={`https://www.wikidata.org/wiki/${value.value?.startsWith('P') ? 'Property:' : ''}${value.value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto shrink-0 self-center text-xs text-accent hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          View
                        </Link>
                      )}
                </CommandItem>
              </CommandGroup>
            )}

            {/* Custom entities */}
            {customEntities.length > 0 && (
              <CommandGroup heading="Corpus entities">
                {customEntities.map((entity, index) => (
                  <CommandItem
                    key={getEntityOptionKey(entity, 'custom', index)}
                    value={getEntityOptionValue(entity, 'custom', index)}
                    onSelect={() => {
                      onValueChange(entity)
                      setOpen(false)
                    }}
                    className="items-start py-2"
                  >
                    <CheckIcon
                      className={cn(
                        'size-3.5 text-muted-foreground',
                        isSelectedEntity(value, entity) ? '' : 'hidden',
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="min-w-0 leading-5">
                        <span>{entity.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          (
                          {entity.value}
                          )
                        </span>
                      </div>
                      {entity.description && (
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {entity.description}
                        </span>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Corpus
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Wikidata entities */}
            {wikidataEntities.length > 0 && (
              <CommandGroup heading="Wikidata Entities">
                {wikidataEntities.map((entity, index) => (
                  <CommandItem
                    key={getEntityOptionKey(entity, 'wikidata', index)}
                    value={getEntityOptionValue(entity, 'wikidata', index)}
                    onSelect={() => {
                      onValueChange(entity)
                      setOpen(false)
                    }}
                    className="items-start py-2"
                  >
                    <CheckIcon
                      className={cn(
                        'size-3.5 text-muted-foreground',
                        isSelectedEntity(value, entity) ? '' : 'hidden',
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="min-w-0 leading-5">
                        <span>{entity.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          (
                          {entity.value}
                          )
                        </span>
                      </div>
                      {entity.description && (
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {entity.description}
                        </span>
                      )}
                      {resultStatus.get(entity.value) === 'unverifiable' && (
                        <Badge variant="secondary">
                          type unknown
                        </Badge>
                      )}
                      {Array.isArray(resultStatus.get(entity.value)) && (
                        <Badge variant="warning">
                          <TriangleAlertIcon />
                          doesn&apos;t match
                          {' '}
                          {formatFilteredSides(resultStatus.get(entity.value) as ConstraintSide[])}
                        </Badge>
                      )}
                    </div>
                    <Link
                      href={`https://www.wikidata.org/wiki/${entity.value.startsWith('P') ? 'Property:' : ''}${entity.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto shrink-0 self-center text-xs text-accent hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      View
                    </Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Constraint filtering escape hatch */}
            {filteringEnabled && activeClassification && filteredOutCount > 0 && (
              <>
                <CommandGroup>
                  {showAllResults
                    ? (
                        <CommandItem
                          value="hide-filtered-results"
                          onSelect={() => setShowAllResults(false)}
                        >
                          <span>Hide incompatible results</span>
                        </CommandItem>
                      )
                    : (
                        <CommandItem
                          value="show-all-results"
                          onSelect={() => setShowAllResults(true)}
                        >
                          <span>
                            Show
                            {' '}
                            {filteredOutCount}
                            {' '}
                            more  (may not match constraints)
                          </span>
                        </CommandItem>
                      )}
                </CommandGroup>
              </>
            )}

            {/* Create new custom entity option */}
            {searchTerm
              && !searchResults.some(entity => entity.value === searchTerm)
              && corpusId && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    key="create-new"
                    value="create-new"
                    onSelect={async () => {
                      try {
                        // Create the entity in the database
                        const customType: 'entity' | 'relation'
                          = entityType === 'predicate' ? 'relation' : 'entity'
                        const customId = await addCorpusCustomEntity(
                          corpusId,
                          searchTerm,
                          searchTerm,
                          'string', // Default datatype
                          customType,
                        )

                        const newEntity: Entity = {
                          label: searchTerm,
                          value: searchTerm,
                          custom: true,
                          customId,
                          datatype: 'string',
                          type: entityType,
                        }

                        onValueChange(newEntity)
                        toast.success('Custom entity created!')
                      } catch (error) {
                        console.error(
                          'Failed to create custom entity:',
                          error,
                        )
                        toast.error(
                          'Failed to create custom entity. Please try again.',
                        )
                        return
                      }
                      setOpen(false)
                    }}
                    className="flex"
                  >
                    <span>
                      Create "
                      {searchTerm}
                      "
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
