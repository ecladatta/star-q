import type { CorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { AlertTriangleIcon, BarChart3Icon, FileTextIcon, TableIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type AnalyticsContentProps = {
  analyticsPromise: Promise<CorpusAnalytics>
}

export async function AnalyticsContent({ analyticsPromise }: AnalyticsContentProps) {
  const analytics = await analyticsPromise

  return (
    <>
      {/* Overview Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileTextIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedDocuments}
              {' '}
              completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Annotations</CardTitle>
            <BarChart3Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAnnotations}</div>
            <p className="text-xs text-muted-foreground">
              Across all documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Properties</CardTitle>
            <TableIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueProperties}</div>
            <p className="text-xs text-muted-foreground">
              Predicates (relations)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Entities</CardTitle>
            <TableIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueEntities}</div>
            <p className="text-xs text-muted-foreground">
              Subjects and objects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Annotation Type Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Annotation Type Breakdown</CardTitle>
          <CardDescription>Distribution of text-only, table-only, and joint (text+table) annotations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <FileTextIcon className="size-5 text-blue-500" />
                <span className="font-medium">Text Only</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{analytics.textOnlyAnnotations}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics.documentsByAnnotationType.textOnly.length}
                  {' '}
                  docs
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <TableIcon className="size-5 text-green-500" />
                <span className="font-medium">Table Only</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{analytics.tableOnlyAnnotations}</div>
                <div className="text-xs text-muted-foreground">
                  {analytics.documentsByAnnotationType.tableOnly.length}
                  {' '}
                  docs
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <BarChart3Icon className="size-5 text-purple-500" />
                <span className="font-medium">Joint (Text+Table)</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{analytics.jointAnnotations}</div>
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
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted">
                  <div className="flex items-center space-x-2">
                    <FileTextIcon className="size-4 text-blue-500" />
                    <span className="font-medium">Documents with Text-Only Annotations</span>
                    <Badge variant="secondary">{analytics.documentsByAnnotationType.textOnly.length}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">Click to expand</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {analytics.documentsByAnnotationType.textOnly.map(doc => (
                    <Link
                      key={doc.documentId}
                      href={`/document/${doc.documentId}?types=text`}
                      className="flex items-center justify-between rounded-md border bg-muted/50 p-2 transition-colors hover:bg-muted"
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
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted">
                  <div className="flex items-center space-x-2">
                    <TableIcon className="size-4 text-green-500" />
                    <span className="font-medium">Documents with Table-Only Annotations</span>
                    <Badge variant="secondary">{analytics.documentsByAnnotationType.tableOnly.length}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">Click to expand</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {analytics.documentsByAnnotationType.tableOnly.map(doc => (
                    <Link
                      key={doc.documentId}
                      href={`/document/${doc.documentId}?types=table`}
                      className="flex items-center justify-between rounded-md border bg-muted/50 p-2 transition-colors hover:bg-muted"
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
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted">
                  <div className="flex items-center space-x-2">
                    <BarChart3Icon className="size-4 text-purple-500" />
                    <span className="font-medium">Documents with Joint Annotations</span>
                    <Badge variant="secondary">{analytics.documentsByAnnotationType.joint.length}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">Click to expand</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {analytics.documentsByAnnotationType.joint.map(doc => (
                    <Link
                      key={doc.documentId}
                      href={`/document/${doc.documentId}?types=joint`}
                      className="flex items-center justify-between rounded-md border bg-muted/50 p-2 transition-colors hover:bg-muted"
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
        </CardContent>
      </Card>

      {/* Documents with Unassigned Predicates */}
      {analytics.documentsWithUnassignedPredicates.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5" style={{ color: '#ADD8E6' }} />
              Documents with Unassigned Predicates
            </CardTitle>
            <CardDescription>
              Documents containing annotations where the predicate (relation) has no entity assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible defaultOpen={analytics.documentsWithUnassignedPredicates.length <= 5}>
              <CollapsibleTrigger className="mb-4 flex w-full items-center justify-between rounded-lg border p-3 hover:opacity-90" style={{ backgroundColor: '#ADD8E6' }}>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">View Documents</span>
                  <Badge variant="secondary">{analytics.documentsWithUnassignedPredicates.length}</Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsWithUnassignedPredicates.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?predicate=without`}
                    className="flex items-center justify-between rounded-md border bg-muted/50 p-3 transition-colors hover:bg-muted"
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
          </CardContent>
        </Card>
      )}

      {/* Documents with Unassigned Subjects */}
      {analytics.documentsWithUnassignedSubjects.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5" style={{ color: '#FFE4B5' }} />
              Documents with Unassigned Subjects
            </CardTitle>
            <CardDescription>
              Documents containing annotations where the subject has no entity assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible defaultOpen={analytics.documentsWithUnassignedSubjects.length <= 5}>
              <CollapsibleTrigger className="mb-4 flex w-full items-center justify-between rounded-lg border p-3 hover:opacity-90" style={{ backgroundColor: '#FFE4B5' }}>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">View Documents</span>
                  <Badge variant="secondary">{analytics.documentsWithUnassignedSubjects.length}</Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsWithUnassignedSubjects.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?subject=without`}
                    className="flex items-center justify-between rounded-md border bg-muted/50 p-3 transition-colors hover:bg-muted"
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
          </CardContent>
        </Card>
      )}

      {/* Documents with Unassigned Objects */}
      {analytics.documentsWithUnassignedObjects.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5" style={{ color: '#90EE90' }} />
              Documents with Unassigned Objects
            </CardTitle>
            <CardDescription>
              Documents containing annotations where the object has no entity assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible defaultOpen={analytics.documentsWithUnassignedObjects.length <= 5}>
              <CollapsibleTrigger className="mb-4 flex w-full items-center justify-between rounded-lg border p-3 hover:opacity-90" style={{ backgroundColor: '#90EE90' }}>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">View Documents</span>
                  <Badge variant="secondary">{analytics.documentsWithUnassignedObjects.length}</Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {analytics.documentsWithUnassignedObjects.map(doc => (
                  <Link
                    key={doc.documentId}
                    href={`/document/${doc.documentId}?object=without`}
                    className="flex items-center justify-between rounded-md border bg-muted/50 p-3 transition-colors hover:bg-muted"
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
          </CardContent>
        </Card>
      )}

      {/* Property Statistics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Property Statistics</CardTitle>
          <CardDescription>
            Most frequently used properties across all annotations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.propertyStats.length > 0
            ? (
                <Collapsible defaultOpen={analytics.propertyStats.length <= 10}>
                  <CollapsibleTrigger className="mb-4 flex w-full items-center justify-between rounded-lg border bg-muted/50 p-3 hover:bg-muted">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">View All Properties</span>
                      <Badge variant="secondary">{analytics.propertyStats.length}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>Identifier</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.propertyStats.map((stat) => {
                            const propertyKey = `${stat.label || 'null'}:${stat.value || 'null'}`

                            return (
                              <TableRow key={propertyKey}>
                                <TableCell className="font-medium">
                                  {stat.label || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {stat.value
                                    ? stat.isCustom
                                      ? stat.value
                                      : (
                                          <Link
                                            href={`https://www.wikidata.org/wiki/${stat.value.startsWith('P') ? 'Property:' : ''}${stat.value}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline"
                                          >
                                            {stat.value}
                                          </Link>
                                        )
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-right">{stat.count}</TableCell>
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
        </CardContent>
      </Card>

      {/* Entity Statistics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top 50 Entities</CardTitle>
          <CardDescription>
            Most frequently used entities (subjects and objects) across all annotations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.entityStats.length > 0
            ? (
                <Collapsible defaultOpen={analytics.entityStats.length <= 10}>
                  <CollapsibleTrigger className="mb-4 flex w-full items-center justify-between rounded-lg border bg-muted/50 p-3 hover:bg-muted">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">View All Entities</span>
                      <Badge variant="secondary">{analytics.entityStats.length}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>Identifier</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.entityStats.map((stat) => {
                            const entityKey = `${stat.label || 'null'}:${stat.value || 'null'}`

                            return (
                              <TableRow key={entityKey}>
                                <TableCell className="font-medium">
                                  {stat.label || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {stat.value
                                    ? stat.isCustom
                                      ? stat.value
                                      : (
                                          <Link
                                            href={`https://www.wikidata.org/wiki/${stat.value.startsWith('P') ? 'Property:' : ''}${stat.value}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline"
                                          >
                                            {stat.value}
                                          </Link>
                                        )
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-right">{stat.count}</TableCell>
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
        </CardContent>
      </Card>
    </>
  )
}
