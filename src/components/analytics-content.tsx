import type { CorpusAnalytics } from '@/actions/analytics/analyticsActions'
import type { CorpusWarnings } from '@/lib/wikidata-constraints'
import { AlertTriangleIcon, BarChart3Icon, ChevronRightIcon, FileTextIcon, TableIcon } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { WikidataWarningsSection, WikidataWarningsSkeleton } from './wikidata-warnings-section'

type AnalyticsContentProps = {
  analyticsPromise: Promise<CorpusAnalytics>
  warningsPromise: Promise<CorpusWarnings>
}

export async function AnalyticsContent({ analyticsPromise, warningsPromise }: AnalyticsContentProps) {
  const analytics = await analyticsPromise

  return (
    <>
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Total Documents</div>
            <FileTextIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-xl font-semibold text-foreground tabular-nums">{analytics.totalDocuments}</div>
          <p className="text-xs text-muted-foreground">
            {analytics.completedDocuments}
            {' '}
            completed
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Total Annotations</div>
            <BarChart3Icon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-xl font-semibold text-foreground tabular-nums">{analytics.totalAnnotations}</div>
          <p className="text-xs text-muted-foreground">
            Across all documents
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Unique Properties</div>
            <TableIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-xl font-semibold text-foreground tabular-nums">{analytics.uniqueProperties}</div>
          <p className="text-xs text-muted-foreground">
            Predicates (relations)
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Unique Entities</div>
            <TableIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-xl font-semibold text-foreground tabular-nums">{analytics.uniqueEntities}</div>
          <p className="text-xs text-muted-foreground">
            Subjects and objects
          </p>
        </div>
      </div>

      {/* Annotation Type Breakdown */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-foreground">Annotation Type Breakdown</div>
        <div className="text-xs text-muted-foreground">Distribution of text-only, table-only, and joint (text+table) annotations</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div className="flex items-center space-x-2">
              <FileTextIcon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Text Only</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl font-semibold text-foreground tabular-nums">{analytics.textOnlyAnnotations}</div>
              <div className="text-xs text-muted-foreground">
                {analytics.documentsByAnnotationType.textOnly.length}
                {' '}
                docs
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div className="flex items-center space-x-2">
              <TableIcon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Table Only</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl font-semibold text-foreground tabular-nums">{analytics.tableOnlyAnnotations}</div>
              <div className="text-xs text-muted-foreground">
                {analytics.documentsByAnnotationType.tableOnly.length}
                {' '}
                docs
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div className="flex items-center space-x-2">
              <BarChart3Icon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Joint (Text+Table)</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl font-semibold text-foreground tabular-nums">{analytics.jointAnnotations}</div>
              <div className="text-xs text-muted-foreground">
                {analytics.documentsByAnnotationType.joint.length}
                {' '}
                docs
              </div>
            </div>
          </div>
        </div>

        {/* Documents by Annotation Type */}
        <div className="mt-6 space-y-4">
          {/* Text Only Documents */}
          {analytics.documentsByAnnotationType.textOnly.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-muted">
                <div className="flex items-center space-x-2">
                  <FileTextIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Documents with Text-Only Annotations</span>
                  <Badge variant="secondary">{analytics.documentsByAnnotationType.textOnly.length}</Badge>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsByAnnotationType.textOnly.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?types=text`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2 text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm">{doc.documentTitle}</span>
                    <Badge variant="secondary">
                      {doc.annotationCount}
                      {' '}
                      annotations
                    </Badge>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Table Only Documents */}
          {analytics.documentsByAnnotationType.tableOnly.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-muted">
                <div className="flex items-center space-x-2">
                  <TableIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Documents with Table-Only Annotations</span>
                  <Badge variant="secondary">{analytics.documentsByAnnotationType.tableOnly.length}</Badge>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsByAnnotationType.tableOnly.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?types=table`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2 text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm">{doc.documentTitle}</span>
                    <Badge variant="secondary">
                      {doc.annotationCount}
                      {' '}
                      annotations
                    </Badge>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Joint Documents */}
          {analytics.documentsByAnnotationType.joint.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-muted">
                <div className="flex items-center space-x-2">
                  <BarChart3Icon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Documents with Joint Annotations</span>
                  <Badge variant="secondary">{analytics.documentsByAnnotationType.joint.length}</Badge>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsByAnnotationType.joint.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?types=joint`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2 text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm">{doc.documentTitle}</span>
                    <Badge variant="secondary">
                      {doc.annotationCount}
                      {' '}
                      annotations
                    </Badge>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Documents with Unassigned Predicates */}
      {analytics.documentsWithUnassignedPredicates.length > 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangleIcon className="size-4 text-warning-foreground" />
            Documents with Unassigned Predicates
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Documents containing annotations where the predicate (relation) has no entity assigned
          </p>
          <div className="mt-4">
            <Collapsible defaultOpen={analytics.documentsWithUnassignedPredicates.length <= 5}>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border bg-warning/40 p-3 hover:bg-warning/60">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">View Documents</span>
                  <Badge variant="secondary">{analytics.documentsWithUnassignedPredicates.length}</Badge>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsWithUnassignedPredicates.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?predicate=without`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{doc.documentTitle}</span>
                    <Badge variant="destructive">
                      {doc.unassignedPredicateCount}
                      {' '}
                      unassigned
                    </Badge>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      )}

      {/* Documents with Unassigned Subjects */}
      {analytics.documentsWithUnassignedSubjects.length > 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangleIcon className="size-4 text-warning-foreground" />
            Documents with Unassigned Subjects
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Documents containing annotations where the subject has no entity assigned
          </p>
          <div className="mt-4">
            <Collapsible defaultOpen={analytics.documentsWithUnassignedSubjects.length <= 5}>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border bg-warning/40 p-3 hover:bg-warning/60">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">View Documents</span>
                  <Badge variant="secondary">{analytics.documentsWithUnassignedSubjects.length}</Badge>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsWithUnassignedSubjects.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?subject=without`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{doc.documentTitle}</span>
                    <Badge variant="destructive">
                      {doc.unassignedSubjectCount}
                      {' '}
                      unassigned
                    </Badge>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      )}

      {/* Documents with Unassigned Objects */}
      {analytics.documentsWithUnassignedObjects.length > 0 && (
        <div className="mt-8 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangleIcon className="size-4 text-warning-foreground" />
            Documents with Unassigned Objects
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Documents containing annotations where the object has no entity assigned
          </p>
          <div className="mt-4">
            <Collapsible defaultOpen={analytics.documentsWithUnassignedObjects.length <= 5}>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border bg-warning/40 p-3 hover:bg-warning/60">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-foreground">View Documents</span>
                  <Badge variant="secondary">{analytics.documentsWithUnassignedObjects.length}</Badge>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsWithUnassignedObjects.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?object=without`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{doc.documentTitle}</span>
                    <Badge variant="secondary">
                      {doc.unassignedObjectCount}
                      {' '}
                      unassigned
                    </Badge>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      )}

      {/* Warnings */}
      <Suspense fallback={<WikidataWarningsSkeleton />}>
        <WikidataWarningsSection warningsPromise={warningsPromise} />
      </Suspense>

      {/* Property Statistics */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-foreground">Property Statistics</div>
        <div className="text-xs text-muted-foreground">
          Most frequently used properties across all annotations
        </div>
        <div className="mt-4">
          {analytics.propertyStats.length > 0
            ? (
                <Collapsible defaultOpen={analytics.propertyStats.length <= 10}>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 p-3 hover:bg-muted">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-foreground">View All Properties</span>
                      <Badge variant="secondary">{analytics.propertyStats.length}</Badge>
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="w-full overflow-hidden rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Label</TableHead>
                            <TableHead className="bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Identifier</TableHead>
                            <TableHead className="bg-muted/40 px-3 py-2 text-right text-xs font-medium text-muted-foreground">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.propertyStats.map((stat) => {
                            const propertyKey = `${stat.label || 'null'}:${stat.value || 'null'}`

                            return (
                              <TableRow key={propertyKey} className="border-t border-border hover:bg-muted/30">
                                <TableCell className="px-3 py-2.5 text-[13px] font-medium text-foreground">
                                  {stat.label || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-[13px]">
                                  {stat.value
                                    ? stat.isCustom
                                      ? stat.value
                                      : (
                                          <Link
                                            href={`https://www.wikidata.org/wiki/${stat.value.startsWith('P') ? 'Property:' : ''}${stat.value}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-accent underline hover:opacity-80"
                                          >
                                            {stat.value}
                                          </Link>
                                        )
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-right font-mono text-[13px] text-muted-foreground tabular-nums">{stat.count}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            : (
                <p className="text-center text-muted-foreground">No properties found</p>
              )}
        </div>
      </div>

      {/* Entity Statistics */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-foreground">Top 50 Entities</div>
        <div className="text-xs text-muted-foreground">
          Most frequently used entities (subjects and objects) across all annotations
        </div>
        <div className="mt-4">
          {analytics.entityStats.length > 0
            ? (
                <Collapsible defaultOpen={analytics.entityStats.length <= 10}>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 p-3 hover:bg-muted">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-foreground">View All Entities</span>
                      <Badge variant="secondary">{analytics.entityStats.length}</Badge>
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="w-full overflow-hidden rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Label</TableHead>
                            <TableHead className="bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Identifier</TableHead>
                            <TableHead className="bg-muted/40 px-3 py-2 text-right text-xs font-medium text-muted-foreground">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.entityStats.map((stat) => {
                            const entityKey = `${stat.label || 'null'}:${stat.value || 'null'}`

                            return (
                              <TableRow key={entityKey} className="border-t border-border hover:bg-muted/30">
                                <TableCell className="px-3 py-2.5 text-[13px] font-medium text-foreground">
                                  {stat.label || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-[13px]">
                                  {stat.value
                                    ? stat.isCustom
                                      ? stat.value
                                      : (
                                          <Link
                                            href={`https://www.wikidata.org/wiki/${stat.value.startsWith('P') ? 'Property:' : ''}${stat.value}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-accent underline hover:opacity-80"
                                          >
                                            {stat.value}
                                          </Link>
                                        )
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-right font-mono text-[13px] text-muted-foreground tabular-nums">{stat.count}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            : (
                <p className="text-center text-muted-foreground">No entities found</p>
              )}
        </div>
      </div>
    </>
  )
}
