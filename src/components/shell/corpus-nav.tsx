'use client'

import type { ReactNode } from 'react'
import { Library } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { corpusNav, isActive } from './nav-items'

type CorpusNavProps = {
  corpusId: string
  corpusTitle: string | null
  canManage: boolean
  canEdit: boolean
  documentCount: number
  children: ReactNode
}

export function CorpusNav({ corpusId, corpusTitle, canManage, canEdit, documentCount, children }: CorpusNavProps) {
  const pathname = usePathname()
  const items = corpusNav(corpusId, { canManage, canEdit }, documentCount)
  const title = corpusTitle ?? corpusId

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav
        className="flex h-10 shrink-0 items-center gap-4 overflow-x-auto border-b bg-muted pl-5 sm:pl-8"
        aria-label="Corpus sections"
      >
        <Link
          href={`/corpus/${corpusId}`}
          className="flex h-8 shrink-0 items-center gap-2 rounded-md pr-3 text-[14px] font-semibold text-foreground transition-colors hover:text-foreground/80"
          title={title}
        >
          <Library className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="max-w-56 truncate">{title}</span>
        </Link>
        <div className="-mb-px flex shrink-0 items-end">
          {items.map((item) => {
            const active = isActive(pathname, item)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px flex h-10 shrink-0 items-center border-b-2 border-transparent text-[13px] text-muted-foreground transition-colors hover:text-foreground',
                  active && 'border-foreground font-medium text-foreground',
                )}
              >
                <span className={cn(
                  'flex h-8 items-center gap-2 rounded-md px-2.5 transition-colors',
                  !active && 'hover:bg-border dark:hover:bg-background',
                )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
