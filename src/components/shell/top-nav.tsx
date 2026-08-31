'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/utils'
import { CommandMenu } from './command-menu'
import { isActive, topNav } from './nav-items'
import { UserMenu } from './user-menu'

type TopNavUser = {
  username: string
  name: string | null
  isAdmin: boolean
  invitationCount: number
  corpora: { id: string, title: string | null }[]
}

export function TopNav({ user }: { user: TopNavUser }) {
  const pathname = usePathname()
  const items = topNav({ isAdmin: user.isAdmin, invitationCount: user.invitationCount })
  const hasCorpusNav = pathname.startsWith('/corpus/') || pathname.startsWith('/document/')

  return (
    <header className={cn('flex h-14 shrink-0 items-center gap-2 bg-muted px-4 sm:px-6', !hasCorpusNav && 'border-b')}>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} aria-current={isActive(pathname, item) ? 'page' : undefined}>
                    <Icon strokeWidth={1.75} />
                    {item.label}
                    {item.badge ? ` (${item.badge})` : ''}
                  </Link>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">Account</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link
        href="/"
        className="shrink-0 text-[15px] font-semibold tracking-tight hover:opacity-75"
      >
        {APP_NAME}
      </Link>

      <nav className="ml-4 hidden min-w-0 items-center gap-1 md:flex" aria-label="Main">
        {items.map((item) => {
          const active = isActive(pathname, item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground',
                active && 'bg-background font-medium text-foreground',
                !active && 'hover:bg-border dark:hover:bg-background',
              )}
            >
              {item.label}
              {item.badge
                ? (
                    <span
                      className={cn(
                        'min-w-5 rounded-full px-1.5 text-center text-[11px]/5 font-medium tabular-nums',
                        active
                          ? 'bg-background text-foreground ring-1 ring-border'
                          : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {item.badge}
                    </span>
                  )
                : null}
            </Link>
          )
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <CommandMenu
          isAdmin={user.isAdmin}
          invitationCount={user.invitationCount}
          corpora={user.corpora}
        />
        <ThemeToggle />
        <UserMenu username={user.username} name={user.name} />
      </div>
    </header>
  )
}
