import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Page({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  titleBadge,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  titleBadge?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold tracking-[-0.01em]">
          <span className="min-w-0 truncate">{title}</span>
          {titleBadge}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          {children}
        </div>
      )}
    </div>
  )
}
