'use client'

import type { DocumentSearchResult } from '@/actions/document/documentActions'
import { Database, FileText, Loader2Icon, Moon, Search, Sun } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { searchDocumentsByTitle } from '@/actions/document/documentActions'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { toggleTheme, useRootTheme } from '@/lib/theme'
import { buildNav } from './nav-items'

type CommandMenuProps = {
  isAdmin: boolean
  invitationCount: number
  corpora: { id: string, title: string | null }[]
}

export function CommandMenu({ isAdmin, invitationCount, corpora }: CommandMenuProps) {
  const groups = buildNav({ isAdmin, invitationCount })
  const [open, setOpen] = useState(false)
  const dark = useRootTheme() === 'dark'
  const isMac = useSyncExternalStore(() => () => {}, () => /Mac/i.test(navigator.platform), () => true)
  const router = useRouter()
  const pathname = usePathname()
  const corpusId = useMemo(() => {
    const match = pathname.match(/^\/corpus\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i)
    return match?.[1] ?? null
  }, [pathname])
  const [search, setSearch] = useState<{ corpusId: string, term: string, documents: DocumentSearchResult[] } | null>(null)
  const [term, setTerm] = useState('')
  const trimmedTerm = term.trim()

  useEffect(() => {
    if (!corpusId || !trimmedTerm)
      return

    const timer = setTimeout(() => {
      searchDocumentsByTitle(corpusId, trimmedTerm)
        .then(documents => setSearch({ corpusId, term: trimmedTerm, documents }))
        .catch(() => setSearch({ corpusId, term: trimmedTerm, documents: [] }))
    }, 200)
    return () => clearTimeout(timer)
  }, [corpusId, trimmedTerm])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(previous => !previous)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const navigate = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  const result = search?.corpusId === corpusId ? search : null
  const pending = Boolean(corpusId && trimmedTerm) && result?.term !== trimmedTerm
  const refined = Boolean(result && trimmedTerm && (result.term.startsWith(trimmedTerm) || trimmedTerm.startsWith(result.term)))
  const visibleDocuments = result && (result.term === trimmedTerm || refined)
    ? result.documents
    : []

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="hidden h-8 gap-2 text-muted-foreground hover:bg-border hover:text-foreground sm:inline-flex dark:hover:bg-background"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Search className="size-4" strokeWidth={1.75} />
        <span className="text-[13px]">Search</span>
        <kbd className="ml-2 rounded-sm border bg-background px-1.5 font-mono text-[10px]/4 text-muted-foreground">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} className="h-auto w-full max-w-lg">
        <Command>
          <CommandInput placeholder={corpusId ? 'Search documents, corpora or jump to…' : 'Search corpora or jump to…'} value={term} onValueChange={setTerm} />
          <CommandList>
            {!pending && <CommandEmpty>No results.</CommandEmpty>}
            {groups.map(group => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.href}
                      value={`${group.label} ${item.label}`}
                      onSelect={() => navigate(item.href)}
                    >
                      <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      {item.label}
                      {item.badge
                        ? (
                            <span className="ml-auto min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px]/5 font-medium text-destructive-foreground tabular-nums">
                              {item.badge}
                            </span>
                          )
                        : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
            {pending && visibleDocuments.length === 0 && (
              <>
                <CommandSeparator />
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground" role="status">
                  <Loader2Icon className="size-4 animate-spin" />
                  Searching documents…
                </div>
              </>
            )}
            {visibleDocuments.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Documents in this corpus">
                  {visibleDocuments.map(doc => (
                    <CommandItem
                      key={doc.id}
                      value={`${doc.title} ${doc.id}`}
                      onSelect={() => navigate(`/document/${doc.id}`)}
                    >
                      <FileText className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      <span className="truncate">{doc.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            {corpora.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Your corpora">
                  {corpora.map(corpus => (
                    <CommandItem
                      key={corpus.id}
                      value={`corpus ${corpus.title ?? corpus.id}`}
                      onSelect={() => navigate(`/corpus/${corpus.id}`)}
                    >
                      <Database className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      <span className="truncate">{corpus.title ?? corpus.id}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
            <CommandSeparator />
            <CommandGroup heading="Theme">
              <CommandItem
                value="theme"
                onSelect={() => {
                  toggleTheme()
                  setOpen(false)
                }}
              >
                {dark ? <Sun /> : <Moon />}
                Switch to
                {' '}
                {dark ? 'light' : 'dark'}
                {' '}
                mode
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
