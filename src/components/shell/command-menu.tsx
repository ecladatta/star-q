'use client'

import { Database, Moon, Search, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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
import { readTheme, toggleTheme } from '@/lib/theme'
import { buildNav } from './nav-items'

type CommandMenuProps = {
  isAdmin: boolean
  invitationCount: number
  corpora: { id: string, title: string | null }[]
}

export function CommandMenu({ isAdmin, invitationCount, corpora }: CommandMenuProps) {
  const groups = buildNav({ isAdmin, invitationCount })
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.platform))
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setDark(readTheme() === 'dark')
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

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="hidden h-8 gap-2 text-muted-foreground hover:bg-border hover:text-foreground sm:inline-flex dark:hover:bg-background"
        onClick={() => {
          setDark(readTheme() === 'dark')
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
          <CommandInput placeholder="Search corpora or jump to…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
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
                            <span className="ml-auto text-xs text-muted-foreground">
                              {item.badge}
                              {' '}
                              pending
                            </span>
                          )
                        : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
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
                  setDark(readTheme() === 'dark')
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
