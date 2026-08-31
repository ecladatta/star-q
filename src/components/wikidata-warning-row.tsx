'use client'

import type { ConstraintCheck, ConstraintGroup } from '@/lib/wikidata-constraints'
import { AlertTriangleIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CONSTRAINT_RELATION_LABELS, groupByRelation, WIKIDATA_ITEM_PATTERN, WIKIDATA_PROPERTY_PATTERN } from '@/lib/wikidata-constraints'

const VISIBLE_CLASS_LIMIT = 5

function visibleGroupsUpTo(groups: ConstraintGroup[], limit: number): ConstraintGroup[] {
  const visible: ConstraintGroup[] = []
  let remaining = limit
  for (const group of groups) {
    if (remaining <= 0) {
      break
    }
    const classes = group.classes.slice(0, remaining)
    remaining -= classes.length
    visible.push({ relation: group.relation, classes })
  }
  return visible
}

function WikidataLink({ id, label }: { id: string, label: string }) {
  if (!WIKIDATA_ITEM_PATTERN.test(id) && !WIKIDATA_PROPERTY_PATTERN.test(id)) {
    return <span>{label}</span>
  }
  const isProperty = id.startsWith('P')
  return (
    <Link
      href={`https://www.wikidata.org/wiki/${isProperty ? 'Property:' : ''}${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
    >
      {label}
    </Link>
  )
}

export function WikidataWarningRow({ check, muted }: { check: ConstraintCheck, muted?: boolean }) {
  const [expanded, setExpanded] = useState<boolean>(false)
  const subjectText = check.subjectLabel ?? check.subjectValue
  const objectText = check.objectLabel ?? check.objectValue
  const isQualifier = check.kind === 'qualifier'
  const qualifierPredicateText = check.qualifierPredicateLabel ?? check.qualifierPredicateValue
  const groups = groupByRelation(check.expectedClasses)
  const totalClasses = check.expectedClasses.length
  const truncated = totalClasses > VISIBLE_CLASS_LIMIT
  const hiddenCount = totalClasses - VISIBLE_CLASS_LIMIT
  const visibleGroups = truncated && !expanded
    ? visibleGroupsUpTo(groups, VISIBLE_CLASS_LIMIT)
    : groups

  return (
    <div className={cn('flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-[13px]', muted && 'bg-muted/40')}>
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant={muted ? 'secondary' : 'destructive'}>
            {isQualifier ? 'Qualifier' : (check.side === 'domain' ? 'Domain' : 'Range')}
          </Badge>
          <span>
            <span className="font-medium">
              {subjectText ? <WikidataLink id={check.subjectValue ?? ''} label={subjectText} /> : '—'}
            </span>
            <span className="text-muted-foreground"> → </span>
            <span className="font-medium">
              <WikidataLink id={check.predicateValue} label={check.predicateLabel} />
            </span>
            <span className="text-muted-foreground"> → </span>
            <span className="font-medium">
              {objectText ? <WikidataLink id={check.objectValue ?? ''} label={objectText} /> : '—'}
            </span>
            {isQualifier && check.qualifierPredicateValue && (
              <>
                <span className="text-muted-foreground"> · qualifier: </span>
                <span className="font-medium">
                  <WikidataLink id={check.qualifierPredicateValue} label={qualifierPredicateText ?? ''} />
                </span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">
                  {check.qualifierValueValue
                    ? <WikidataLink id={check.qualifierValueValue} label={check.qualifierValueLabel ?? check.qualifierValueValue} />
                    : '—'}
                </span>
              </>
            )}
          </span>
          <Link
            href={`/document/${check.documentId}?annotation=${check.annotationId}`}
            className="ml-auto text-xs text-accent hover:underline"
          >
            View annotation
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {muted
            ? `Type could not be verified for ${check.itemLabel} (${check.itemValue}) - no instance-of/subclass-of data.`
            : (
                <>
                  {check.itemLabel}
                  {' '}
                  (
                  {check.itemValue}
                  )
                  {' '}
                  is not
                  {' '}
                  {visibleGroups.map((group, index) => (
                    <span key={`${group.relation}:${group.classes.map(constraint => constraint.class).join(',')}`}>
                      {index > 0 && ' or '}
                      {CONSTRAINT_RELATION_LABELS[group.relation]}
                      {': '}
                      {group.classes.map((constraint, classIndex) => (
                        <span key={constraint.class}>
                          {classIndex > 0 && ', '}
                          <WikidataLink id={constraint.class} label={constraint.label} />
                        </span>
                      ))}
                    </span>
                  ))}
                  {truncated && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-accent hover:underline"
                      >
                        {expanded ? 'Show less' : `and ${hiddenCount} more`}
                      </button>
                    </>
                  )}
                </>
              )}
        </p>
      </div>
    </div>
  )
}
