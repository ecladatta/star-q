'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { adminNav, isActive } from './nav-items'

type AdminNavProps = {
  label: string
  children: ReactNode
}

export function AdminNav({ label, children }: AdminNavProps) {
  const pathname = usePathname()
  const items = adminNav()

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="hidden w-52 shrink-0 flex-col border-r bg-muted/40 md:flex" aria-label={label}>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                      active && 'bg-secondary font-medium text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                    {item.badge
                      ? (
                          <span
                            className={cn(
                              'ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px]/5 font-medium tabular-nums',
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
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <nav
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-background px-2 py-1.5 md:hidden"
        aria-label={label}
      >
        {items.map((item) => {
          const active = isActive(pathname, item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-7 shrink-0 items-center rounded-md px-2.5 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                active && 'bg-secondary font-medium text-foreground',
              )}
            >
              {item.label}
              {item.badge ? ` (${item.badge})` : ''}
            </Link>
          )
        })}
      </nav>

      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
