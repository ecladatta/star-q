'use client'

import type { ReactNode } from 'react'
import type { NavItem } from './nav-items'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/utils'
import { isActive } from './nav-items'

type HeaderShellProps = {
  beforeLogo?: ReactNode
  children: ReactNode
}

export function HeaderShell({ beforeLogo, children }: HeaderShellProps) {
  const pathname = usePathname()
  const hasCorpusNav = pathname.startsWith('/corpus/') || pathname.startsWith('/document/')
  const isDocumentViewer = pathname.startsWith('/document/')

  return (
    <header className={cn(
      'flex h-14 shrink-0 items-center gap-2 bg-muted px-4 sm:px-6',
      !hasCorpusNav && 'border-b',
      !isDocumentViewer && 'sticky top-0 z-40',
    )}
    >
      {beforeLogo}
      <Link href="/" className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight hover:opacity-75">
        <Logo className="size-6 shrink-0" />
        {APP_NAME}
      </Link>
      {children}
    </header>
  )
}

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="ml-4 hidden min-w-0 items-center gap-1 self-stretch md:flex" aria-label="Main">
      {items.map((item) => {
        const active = isActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-full shrink-0 items-center border-b-2 border-transparent text-[13px] text-muted-foreground transition-colors hover:text-foreground',
              active && 'border-foreground font-medium text-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-2.5 transition-colors',
                !active && 'hover:bg-border dark:hover:bg-background',
              )}
            >
              {item.label}
              {item.badge
                ? (
                    <span className="min-w-5 rounded-full bg-secondary px-1.5 text-center text-[11px]/5 font-medium text-muted-foreground tabular-nums">
                      {item.badge}
                    </span>
                  )
                : null}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
