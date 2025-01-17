import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import WBK from 'wikibase-sdk'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
})

async function searchEntity(type: 'subject' | 'predicate' | 'object', searchTerm: string): Promise<{ id: string, label: string, description: string }[]> {
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

type EntityType = 'subject' | 'predicate' | 'object'
type EntityValue = { label: string, value: string, custom: boolean }

export function EntitySelector({ type, value, onValueChange }: {
  type: EntityType
  value: EntityValue | null
  onValueChange: (arg0: EntityValue | null) => any
}) {
  const [open, setOpen] = useState(false)
  const [searchEntities, setSearchEntities] = useState<EntityValue[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? searchEntities.find(framework => framework.value === value.value)?.label
            : 'Select entity...'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command
          onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
            const searchTerm = e.target.value
            setSearchTerm(searchTerm)
            const results = await searchEntity(type, searchTerm)
            setSearchEntities(results.map(result => ({
              label: result.label,
              value: result.id,
              custom: false,
            })))
          }}
          shouldFilter={false}
        >
          <CommandInput
            placeholder="Search entity..."
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
                  {value.value && (
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
                      const newEntity = { label: searchTerm, value: searchTerm, custom: true }
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
