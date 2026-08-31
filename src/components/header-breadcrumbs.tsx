'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export type BreadcrumbCrumb = {
  href?: string
  label: string
}

const CORPUS_SECTION_LABELS: Record<string, string> = {
  access: 'Access',
  analytics: 'Analytics',
}

type HeaderBreadcrumbsProps = {
  corpus?: { id: string, title: string | null } | null
  document?: { id: string, title: string | null } | null
  crumbs?: BreadcrumbCrumb[]
}

export function HeaderBreadcrumbs({
  corpus,
  document,
  crumbs = [],
}: HeaderBreadcrumbsProps) {
  const pathname = usePathname()

  const items: BreadcrumbCrumb[] = []
  if (corpus) {
    items.push({ href: `/corpus/${corpus.id}`, label: corpus.title ?? 'Corpus' })
  }
  if (document) {
    items.push({ href: `/document/${document.id}`, label: document.title ?? 'Document' })
  }
  items.push(...crumbs)

  const segments = pathname.split('/').filter(Boolean)
  if (
    corpus
    && segments[0] === 'corpus'
    && segments[1] === corpus.id
    && CORPUS_SECTION_LABELS[segments[2]]
  ) {
    items.push({ label: CORPUS_SECTION_LABELS[segments[2]] })
  }

  if (items.length === 0) {
    return null
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex min-w-0 flex-nowrap gap-1 sm:gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isCurrent = isLast && (!item.href || item.href === pathname)
          return (
            <Fragment key={item.label}>
              {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
              <BreadcrumbItem className="min-w-0">
                {isCurrent || !item.href
                  ? (
                      <BreadcrumbPage className="max-w-[180px] truncate">
                        {item.label}
                      </BreadcrumbPage>
                    )
                  : (
                      <BreadcrumbLink asChild className="max-w-[180px] truncate">
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
