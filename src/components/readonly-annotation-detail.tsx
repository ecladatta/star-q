import type {
  AnnotationComponentRole,
  DocumentAnnotation,
  DocumentAnnotationComponent,
  DocumentAnnotationQualifier,
  EntityType,
} from '@/types/types'

import { ArrowDownIcon, ArrowRightIcon, ExternalLinkIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TYPE_TO_COLOR } from '@/lib/constants'
import { cn } from '@/lib/utils'

const ENTITY_ORDER: EntityType[] = ['subject', 'predicate', 'object']

function isWikidataId(value: string | null): boolean {
  return value != null && /^(?:Q|P)\d+$/.test(value)
}

function EntityId({ component }: { component: DocumentAnnotationComponent }) {
  const { entityValue, entityLabel, entityCustom } = component
  if (!entityValue || entityValue === entityLabel) {
    return null
  }
  if (isWikidataId(entityValue) && !entityCustom) {
    return (
      <a
        href={`https://www.wikidata.org/wiki/${entityValue}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:underline"
        onClick={event => event.stopPropagation()}
      >
        {entityValue}
        <ExternalLinkIcon className="size-3" />
      </a>
    )
  }
  return entityValue
}

function componentTagRole(entityRole: EntityType | 'predicate' | 'value'): AnnotationComponentRole {
  if (entityRole === 'predicate') {
    return 'qualifier-predicate'
  }
  if (entityRole === 'value') {
    return 'qualifier-value'
  }
  return entityRole
}

function ComponentBlock({
  entityRole,
  component,
  onLocate,
  className,
}: {
  entityRole: EntityType | 'predicate' | 'value'
  component: DocumentAnnotationComponent
  onLocate: (component: DocumentAnnotationComponent) => void
  className?: string
}) {
  const tagRole = componentTagRole(entityRole)

  return (
    <div className={cn('flex flex-col', className)}>
      <button
        type="button"
        onClick={() => onLocate(component)}
        className="mb-1 flex w-full items-center justify-between truncate rounded-md px-2 py-0.5 text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ backgroundColor: TYPE_TO_COLOR[tagRole] }}
        title={component.annotationValue}
      >
        <span className="truncate">{component.annotationValue || '\u00A0'}</span>
      </button>
      {component.entityValue && (
        <div className="flex w-full min-w-0 items-start gap-1">
          <Badge
            variant="secondary"
            className="min-w-0 flex-1 shrink justify-between overflow-visible rounded-md whitespace-normal"
          >
            {component.entityLabel && (
              <span className="min-w-0">{component.entityLabel}</span>
            )}
            <EntityId component={component} />
          </Badge>
          {component.entityDatatype && (
            <Badge variant="outline" className="shrink-0 font-normal">
              {component.entityDatatype}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

function QualifierBlock({
  qualifier,
  onLocate,
}: {
  qualifier: DocumentAnnotationQualifier
  onLocate: (component: DocumentAnnotationComponent) => void
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-2 sm:flex-row sm:items-stretch">
      <ComponentBlock entityRole="predicate" component={qualifier.predicate} onLocate={onLocate} />
      <div className="flex items-center justify-center px-2 text-muted-foreground">
        <ArrowRightIcon className="hidden size-4 sm:block" />
        <ArrowDownIcon className="size-4 sm:hidden" />
      </div>
      <ComponentBlock entityRole="value" component={qualifier.value} onLocate={onLocate} />
    </div>
  )
}

type ReadOnlyAnnotationDetailProps = {
  annotation: DocumentAnnotation
  onClose: () => void
  onLocate: (component: DocumentAnnotationComponent) => void
}

export function ReadOnlyAnnotationDetail({
  annotation,
  onClose,
  onLocate,
}: ReadOnlyAnnotationDetailProps) {
  const qualifiers = annotation.qualifiers

  return (
    <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-(--breakpoint-md) -translate-x-1/2 md:w-3/4 lg:w-2/3">
      <Card className="mb-6 w-full rounded-lg border shadow-lg">
        <CardHeader className="flex flex-row items-center pt-4 pb-2">
          <CardTitle>Annotation</CardTitle>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close annotation">
              <XIcon className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ENTITY_ORDER.map((entityType) => {
              const component = annotation[entityType]
              if (!component) {
                return null
              }
              return (
                <ComponentBlock
                  key={entityType}
                  entityRole={entityType}
                  component={component}
                  onLocate={onLocate}
                />
              )
            })}
          </div>

          {qualifiers.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold">
                Qualifiers
                {' '}
                (
                {qualifiers.length}
                )
              </div>
              <div className="space-y-2">
                {qualifiers.map(qualifier => (
                  <QualifierBlock key={qualifier.id} qualifier={qualifier} onLocate={onLocate} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
