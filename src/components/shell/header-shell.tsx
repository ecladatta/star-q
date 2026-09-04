'use client'

import type { ReactNode } from 'react'
import type { NavItem } from './nav-items'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  return (
    <header className={cn('flex h-14 shrink-0 items-center gap-2 bg-muted px-4 sm:px-6', !hasCorpusNav && 'border-b')}>
      {beforeLogo}
      <Link href="/" className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight hover:opacity-75">
        <Image src="/logo.svg" alt="" width={24} height={24} unoptimized />
        {APP_NAME}
      </Link>
      {children}
    </header>
  )
}

export function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
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
  )
}
