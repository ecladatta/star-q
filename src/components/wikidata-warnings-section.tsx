import type { ConstraintCheck, CorpusWarnings } from '@/lib/wikidata-constraints'
import { AlertTriangleIcon, CheckCircle2Icon, ChevronRightIcon, Loader2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { WikidataWarningRow } from './wikidata-warning-row'

type WikidataWarningsSectionProps = {
  warningsPromise: Promise<CorpusWarnings>
  groupByDocument?: boolean
  compact?: boolean
}

type DocumentWarnings = {
  documentId: string
  documentTitle: string
  violations: ConstraintCheck[]
  unverifiable: ConstraintCheck[]
}

function groupByDocumentId(warnings: CorpusWarnings): DocumentWarnings[] {
  const byDocument = new Map<string, DocumentWarnings>()

  const add = (check: ConstraintCheck, list: 'violations' | 'unverifiable') => {
    const entry = byDocument.get(check.documentId)
      ?? {
        documentId: check.documentId,
        documentTitle: check.documentTitle,
        violations: [],
        unverifiable: [],
      }
    entry[list].push(check)
    byDocument.set(check.documentId, entry)
  }

  for (const check of warnings.violations) {
    add(check, 'violations')
  }
  for (const check of warnings.unverifiable) {
    add(check, 'unverifiable')
  }

  return Array.from(byDocument.values())
}

function WarningsRows({ violations, unverifiable }: { violations: ConstraintCheck[], unverifiable: ConstraintCheck[] }) {
  return (
    <>
      {violations.map(check => (
        <WikidataWarningRow key={`${check.annotationId}-${check.side}-${check.qualifierId ?? ''}`} check={check} />
      ))}
      {unverifiable.map(check => (
        <WikidataWarningRow
          key={`${check.annotationId}-${check.side}-${check.qualifierId ?? ''}`}
          check={check}
          muted
        />
      ))}
    </>
  )
}

function WikidataWarningsContent({ warnings, groupByDocument, compact }: { warnings: CorpusWarnings, groupByDocument: boolean, compact: boolean }) {
  const totalCount = warnings.violations.length + warnings.unverifiable.length

  if (totalCount === 0 && !warnings.unavailable) {
    return null
  }

  const documents = groupByDocument ? groupByDocumentId(warnings) : []

  return (
    <Collapsible defaultOpen={false}>
      <Card className={compact ? 'mb-6' : 'my-8'}>
        <CollapsibleTrigger asChild>
          <CardHeader className={cn('group cursor-pointer select-none', compact && 'py-3')}>
            <CardTitle className={cn('flex items-center gap-2', compact && 'text-sm font-semibold')}>
              {warnings.unavailable || totalCount > 0
                ? <AlertTriangleIcon className={compact ? 'size-4 text-warning-foreground' : 'size-5 text-warning-foreground'} />
                : <CheckCircle2Icon className={compact ? 'size-4 text-success' : 'size-5 text-success'} />}
              Wikidata Constraints Warnings
              {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
              <ChevronRightIcon className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            </CardTitle>
            {!compact && (
              <CardDescription>
                Domain and range coherence checks against Wikidata property constraints
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {warnings.unavailable
              ? (
                  <p className="text-sm text-muted-foreground">
                    Wikidata constraint check could not be completed, so annotations were not
                    verified.
                  </p>
                )
              : totalCount === 0
                ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2Icon className="size-4 text-success" />
                      No constraint warnings detected across
                      {' '}
                      {warnings.checkedAnnotations}
                      {' '}
                      annotations and
                      {' '}
                      {warnings.checkedProperties}
                      {' '}
                      properties
                    </p>
                  )
                : (
                    <div className={compact ? 'space-y-3' : 'space-y-4'}>
                      {groupByDocument
                        ? (
                            documents.map(doc => (
                              <Collapsible key={doc.documentId} defaultOpen={documents.length <= 5}>
                                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{doc.documentTitle}</span>
                                    <Badge variant="secondary">
                                      {doc.violations.length + doc.unverifiable.length}
                                    </Badge>
                                  </div>
                                  <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2 space-y-2">
                                  <WarningsRows violations={doc.violations} unverifiable={doc.unverifiable} />
                                </CollapsibleContent>
                              </Collapsible>
                            ))
                          )
                        : (
                            <WarningsRows violations={warnings.violations} unverifiable={warnings.unverifiable} />
                          )}
                    </div>
                  )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export async function WikidataWarningsSection({ warningsPromise, groupByDocument = true, compact = false }: WikidataWarningsSectionProps) {
  const warnings = await warningsPromise
  return <WikidataWarningsContent warnings={warnings} groupByDocument={groupByDocument} compact={compact} />
}

export function WikidataWarningsSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="mb-6 space-y-2">
        <div className="h-4 w-48 animate-pulse rounded-sm bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md border border-border bg-muted" />
      </div>
    )
  }

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangleIcon className="size-5 text-warning-foreground" />
          Wikidata Constraints Warnings
        </CardTitle>
        <CardDescription>
          Domain and range coherence checks against Wikidata property constraints
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>
            Checking annotations against Wikidata constraints. This can take a moment for large
            corpora.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
