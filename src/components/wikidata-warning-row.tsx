import type { ConstraintCheck } from '@/lib/wikidata-constraints'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CONSTRAINT_RELATION_LABELS, WIKIDATA_ITEM_PATTERN, WIKIDATA_PROPERTY_PATTERN } from '@/lib/wikidata-constraints'

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
      className="text-blue-600 underline"
    >
      {label}
    </Link>
  )
}

export function WikidataWarningRow({ check, muted }: { check: ConstraintCheck, muted?: boolean }) {
  const relationLabel = CONSTRAINT_RELATION_LABELS[check.expectedClasses[0]?.relation]
    ?? CONSTRAINT_RELATION_LABELS['instance-or-subclass']
  const subjectText = check.subjectLabel ?? check.subjectValue
  const objectText = check.objectLabel ?? check.objectValue
  const isQualifier = check.kind === 'qualifier'
  const qualifierPredicateText = check.qualifierPredicateLabel ?? check.qualifierPredicateValue

  return (
    <div className={cn('rounded-md border p-3', muted && 'bg-muted/30')}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant={muted ? 'secondary' : 'destructive'}>
          {isQualifier ? 'Qualifier' : (check.side === 'domain' ? 'Domain' : 'Range')}
        </Badge>
        <span className="text-sm">
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
          className="ml-auto text-xs text-blue-600 underline"
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
                {relationLabel}
                {' '}
                {check.expectedClasses.map((constraint, index) => (
                  <span key={constraint.class}>
                    {index > 0 && ', '}
                    <WikidataLink id={constraint.class} label={constraint.label} />
                  </span>
                ))}
              </>
            )}
      </p>
    </div>
  )
}
