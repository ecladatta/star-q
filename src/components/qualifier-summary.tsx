import type { DocumentAnnotationQualifier } from '@/types/types'

import { getAnnotationComponentDisplayText, getAnnotationComponentTitle } from '@/lib/annotation-roles'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn } from '@/lib/utils'

const DEFAULT_VISIBLE_QUALIFIER_COUNT = 2

type QualifierSummaryProps = {
  qualifiers: DocumentAnnotationQualifier[]
  limit?: number
  className?: string
}

export function QualifierSummary({
  qualifiers,
  limit = DEFAULT_VISIBLE_QUALIFIER_COUNT,
  className,
}: QualifierSummaryProps) {
  if (qualifiers.length === 0)
    return null

  const visibleQualifiers = qualifiers.slice(0, limit)
  const hiddenQualifierCount = qualifiers.length - visibleQualifiers.length

  return (
    <div className={cn('border-t border-dashed', className)}>
      <div>
        {visibleQualifiers.map(qualifier => (
          <div
            key={qualifier.id}
            className="flex min-w-0 items-center gap-1 rounded-md bg-muted/60 px-1.5 py-1 text-[11px] leading-tight"
          >
            <span
              className="min-w-0 flex-1 truncate rounded-sm px-1.5 py-0.5 font-medium text-slate-800"
              style={{ backgroundColor: TYPE_TO_COLOR['qualifier-predicate'] }}
              title={getAnnotationComponentTitle(qualifier.predicate)}
            >
              {getAnnotationComponentDisplayText(qualifier.predicate)}
            </span>
            <span className="shrink-0 text-muted-foreground">
              &rarr;
            </span>
            <span
              className="min-w-0 flex-1 truncate rounded-sm px-1.5 py-0.5 font-medium text-slate-800"
              style={{ backgroundColor: TYPE_TO_COLOR['qualifier-value'] }}
              title={getAnnotationComponentTitle(qualifier.value)}
            >
              {getAnnotationComponentDisplayText(qualifier.value)}
            </span>
          </div>
        ))}
        {hiddenQualifierCount > 0 && (
          <div className="rounded-md bg-muted/60 px-1.5 py-1 text-[11px] leading-tight font-medium text-muted-foreground">
            +
            {hiddenQualifierCount}
            {' '}
            more
          </div>
        )}
      </div>
    </div>
  )
}
