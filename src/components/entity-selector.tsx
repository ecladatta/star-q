import type { Entity, EntityDatatype, EntityType } from '@/app/corpus/[corpusId]/corpus-view'
import type { ReactNode } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { Calendar1Icon, CalendarClockIcon, CalendarIcon, Check, ChevronsUpDown, ClockIcon, FilterIcon, GlobeIcon, ToggleLeftIcon, TypeIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import WBK from 'wikibase-sdk'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
})

async function searchEntity(type: EntityType, searchTerm: string): Promise<{ id: string, label: string, description: string }[]> {
  const url = wdk.searchEntities({
    search: searchTerm,
    language: 'en',
    limit: 5,
    type: type === 'predicate' ? 'property' : 'item',
  })

  const response = await fetch(url)
  const data = await response.json()
  return data.search.map((result: any) => ({
    id: result.id,
    label: result.label,
    description: result.description,
  }))
}

const TYPES_ICONS: Record<EntityDatatype, ReactNode> = {
  string: <TypeIcon className="size-5" />,
  integer: (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 32 32" fill="currentColor">
      <text x="3" y="22" fontSize="20" fontWeight="bold">42</text>
    </svg>
  ),
  decimal: (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 32 32" fill="currentColor">
      <text x="0" y="22" fontSize="16" fontWeight="bold">3.14</text>
    </svg>
  ),
  boolean: <ToggleLeftIcon className="size-5" />,
  date: <CalendarIcon className="size-5" />,
  time: <ClockIcon className="size-5" />,
  datetime: <CalendarClockIcon className="size-5" />,
  year: (
    <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 32 32" fill="currentColor">
      <text x="5" y="14" fontSize="18" fontWeight="bold">{new Date().getFullYear().toString().slice(0, 2)}</text>
      <text x="5" y="30" fontSize="18" fontWeight="bold">{new Date().getFullYear().toString().slice(-2)}</text>
    </svg>
  ),
  month: <Calendar1Icon className="size-5" />,
  day: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 276.338 276.338" xmlSpace="preserve" className="size-5">
      <path d="M267.207 99.838V58.075c0-21.569-19.036-39.141-42.689-39.748v24.636c0 13.999-11.388 25.387-25.384 25.387-13.997 0-25.385-11.388-25.385-25.387V18.265h-71.98v24.698c0 13.999-11.388 25.387-25.386 25.387-13.997 0-25.384-11.388-25.384-25.387V18.36c-23.262.985-41.868 18.396-41.868 39.71v174.336c0 24.218 19.709 43.932 43.929 43.932h170.216c24.217 0 43.927-19.714 43.927-43.932V99.838h.004zM248.09 232.411c0 13.684-11.131 24.811-24.814 24.811H53.065c-13.682 0-24.812-11.127-24.812-24.811V99.838H248.09v132.573z" />
      <path d="M65.339 11.049v31.913c0 6.104 4.945 11.049 11.049 11.049 6.102 0 11.049-4.945 11.049-11.049V11.049C87.438 4.945 82.491 0 76.389 0c-6.105.005-11.05 4.95-11.05 11.049zM199.137.005c-6.104 0-11.051 4.945-11.051 11.049v31.913c0 6.104 4.946 11.049 11.051 11.049s11.052-4.945 11.052-11.049V11.049C210.18 4.95 205.238.005 199.137.005zM106.19 231.87c12.463 0 21.875-3.481 28.238-10.445 6.352-6.963 9.535-15.037 9.535-24.222 0-8.737-2.719-15.626-8.163-20.666-1.477-1.354-2.814-2.437-4.009-3.239-2.188-1.475-2.352-2.529-.292-4.125 1.157-.901 2.294-1.988 3.407-3.268 3.794-4.392 5.691-9.782 5.691-16.176 0-9.026-3.171-16.23-9.532-21.597s-14.725-8.048-25.095-8.048c-5.582 0-10.296.674-14.137 2.021-3.839 1.349-7.15 3.292-9.945 5.841-3.739 3.594-6.48 7.512-8.23 11.759a52.313 52.313 0 0 0-2.39 10.584c-.315 2.623 1.769 4.761 4.406 4.761H86.03c2.64 0 4.674-2.156 5.057-4.77.465-3.174 1.505-5.853 3.116-8.032 2.366-3.192 6.065-4.793 11.093-4.793 4.383 0 7.775 1.297 10.193 3.893 2.408 2.595 3.619 5.964 3.619 10.108 0 6.395-2.366 10.637-7.089 12.732-2.053.933-5.29 1.544-9.696 1.838-2.632.168-4.774 2.324-4.774 4.957v5.717c0 2.637 2.147 4.756 4.784 4.9 4.669.248 8.254.878 10.744 1.899 5.773 2.399 8.66 7.169 8.66 14.3 0 5.396-1.559 9.521-4.669 12.396-3.11 2.87-6.763 4.303-10.944 4.303-6.823 0-11.532-2.618-14.118-7.859-.845-1.731-1.433-3.733-1.767-6.011-.383-2.614-2.462-4.771-5.106-4.771H73.726c-2.639 0-4.718 2.138-4.427 4.761.714 6.478 2.343 11.878 4.879 16.194 5.979 10.041 16.653 15.058 32.012 15.058zM165.582 154.303h15.976a4.779 4.779 0 0 1 4.778 4.779v65.312a4.783 4.783 0 0 0 4.779 4.779h12.308a4.782 4.782 0 0 0 4.778-4.779v-99.005a4.782 4.782 0 0 0-4.778-4.779h-8.266c-2.637 0-4.812.994-5.064 2.188-.135.63-.312 1.349-.541 2.151-.942 3.244-2.343 5.839-4.182 7.785-2.688 2.842-6.175 4.739-10.454 5.691-1.997.448-5.115.808-9.344 1.092-2.632.168-4.77 2.399-4.77 5.031v4.966a4.788 4.788 0 0 0 4.78 4.789z" />
    </svg>
  ),
  url: <GlobeIcon className="size-5" />,
}

export function EntitySelector({ type, value, onValueChange }: {
  type: EntityType
  value: Entity | null
  onValueChange: (arg0: Entity | null) => any
}) {
  const [open, setOpen] = useState(false)
  const [searchEntities, setSearchEntities] = useState<Entity[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex w-full gap-1">
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex w-full items-center truncate text-left"
          >
            <div className="flex-1 truncate">{value ? value.label : <span className="text-muted-foreground">Search entities...</span>}</div>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
          {value?.custom && (
            <Select
              value={value.datatype || undefined}
              onValueChange={(type: EntityDatatype) => {
                onValueChange({ ...value, datatype: type })
              }}
            >
              <SelectTrigger className="w-auto px-2 [&>svg]:hidden">
                <SelectValue placeholder={<FilterIcon className="size-5" />}>
                  {value.datatype && TYPES_ICONS[value.datatype]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(TYPES_ICONS).toSorted((a, b) => a.localeCompare(b)).map(datatype => (
                  <SelectItem key={datatype} value={datatype}>
                    <div className="flex items-center gap-2">
                      {TYPES_ICONS[datatype as EntityDatatype]}
                      {' '}
                      {datatype.charAt(0).toUpperCase() + datatype.slice(1)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command
          onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
            const searchTerm = e.target.value
            if (!searchTerm) {
              setSearchEntities([])
              return
            }
            setSearchTerm(searchTerm)
            const results = await searchEntity(type, searchTerm)
            setSearchEntities(results.map(result => ({
              label: result.label,
              value: result.id,
              custom: false,
              datatype: null,
            })))
          }}
          shouldFilter={false}
        >
          <CommandInput
            placeholder="Search entity..."
            className="flex-1"
          />
          <CommandList>
            <CommandEmpty>No entities found.</CommandEmpty>
            <CommandGroup>
              {value && !searchEntities.some(entity => entity.value === value.value) && (
                <CommandItem
                  key={value.value}
                  value={value.value}
                  onSelect={() => {
                    onValueChange(value)
                    setOpen(false)
                  }}
                  className="flex rounded-none border-b"
                >
                  <Check
                    className={cn(
                      'size-4',
                      value?.value === value.value ? '' : 'hidden',
                    )}
                  />
                  <span>{value.label}</span>
                  <span className="text-xs text-muted-foreground">
                    (
                    {value.value}
                    )
                  </span>
                  {value.value && !value.custom && (
                    <Link href={`https://www.wikidata.org/wiki/${value.value?.startsWith('P') ? 'Property:' : ''}${value.value}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-blue-500 underline" onClick={e => e.stopPropagation()}>
                      View
                    </Link>
                  )}
                </CommandItem>
              )}
              {searchEntities.map(entity => (
                <CommandItem
                  key={entity.value}
                  value={entity.value}
                  onSelect={() => {
                    onValueChange(entity)
                    setOpen(false)
                  }}
                  className="flex"
                >
                  <Check
                    className={cn(
                      'size-4',
                      value?.value === entity.value ? '' : 'hidden',
                    )}
                  />
                  <span>{entity.label}</span>
                  <span className="text-xs text-muted-foreground">
                    (
                    {entity.value}
                    )
                  </span>
                  {entity.custom
                    ? (
                        <span className="ml-auto text-xs text-muted-foreground">Custom</span>
                      )
                    : (
                        <Link href={`https://www.wikidata.org/wiki/${entity.value.startsWith('P') ? 'Property:' : ''}${entity.value}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-blue-500 underline" onClick={e => e.stopPropagation()}>
                          View
                        </Link>
                      )}
                </CommandItem>
              ))}
              {searchTerm && !searchEntities.some(entity => entity.value === searchTerm) && (
                <CommandItem
                  key="create-new"
                  value="create-new"
                  onSelect={() => {
                    if (!searchEntities.some(entity => entity.value === searchTerm)) {
                      const newEntity = { label: searchTerm, value: searchTerm, custom: true, datatype: 'string' as EntityDatatype }
                      onValueChange(newEntity)
                      setSearchEntities([...searchEntities, newEntity])
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
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
