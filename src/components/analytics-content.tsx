'use client'

import type { CorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { BarChart3Icon, FileTextIcon, TableIcon } from 'lucide-react'
import Link from 'next/link'
import React, { use } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type AnalyticsContentProps = {
  analyticsPromise: Promise<CorpusAnalytics>
}

export function AnalyticsContent({ analyticsPromise }: AnalyticsContentProps) {
  const analytics = use(analyticsPromise)

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
                      href={`/document/${doc.documentId}`}
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
                      href={`/document/${doc.documentId}`}
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
                      href={`/document/${doc.documentId}`}
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
                            <TableHead>Value</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Datatype</TableHead>
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
                                  {stat.value || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {stat.isCustom
                                    ? (
                                        <Badge variant="secondary">Custom</Badge>
                                      )
                                    : (
                                        <Badge variant="outline">Standard</Badge>
                                      )}
                                </TableCell>
                                <TableCell>
                                  {stat.datatype
                                    ? (
                                        <Badge variant="outline">{stat.datatype}</Badge>
                                      )
                                    : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
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
          <CardTitle>Entity Statistics</CardTitle>
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
                            <TableHead>Value</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Datatype</TableHead>
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
                                  {stat.value || <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {stat.isCustom
                                    ? (
                                        <Badge variant="secondary">Custom</Badge>
                                      )
                                    : (
                                        <Badge variant="outline">Standard</Badge>
                                      )}
                                </TableCell>
                                <TableCell>
                                  {stat.datatype
                                    ? (
                                        <Badge variant="outline">{stat.datatype}</Badge>
                                      )
                                    : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
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

      {/* Documents by Entity */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Documents by Entity</CardTitle>
          <CardDescription>
            View which documents contain each entity (subject or object)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.entityStats.length > 0
            ? (
                <div className="space-y-4">
                  {analytics.entityStats.slice(0, 20).map((stat) => {
                    const entityKey = `${stat.label || 'null'}:${stat.value || 'null'}`
                    const documents = analytics.documentsByEntity.get(entityKey) || []

                    return (
                      <Collapsible key={entityKey}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">
                              {stat.label || 'Unknown Label'}
                              :
                              {' '}
                              {stat.value || 'Unknown Value'}
                            </span>
                            {stat.isCustom && <Badge variant="secondary">Custom</Badge>}
                          </div>
                          <Badge variant="outline">
                            {documents.length}
                            {' '}
                            {documents.length === 1 ? 'document' : 'documents'}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {documents.length > 0
                            ? (
                                <div className="space-y-2">
                                  {documents.map(doc => (
                                    <Link
                                      key={doc.documentId}
                                      href={`/document/${doc.documentId}`}
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
                                </div>
                              )
                            : (
                                <p className="text-sm text-muted-foreground">No documents found</p>
                              )}
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                  {analytics.entityStats.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Showing top 20 entities out of
                      {' '}
                      {analytics.entityStats.length}
                    </p>
                  )}
                </div>
              )
            : (
                <p className="text-center text-muted-foreground">No entities to display</p>
              )}
        </CardContent>
      </Card>

      {/* Documents by Property */}
      <Card>
        <CardHeader>
          <CardTitle>Documents by Property</CardTitle>
          <CardDescription>
            View which documents contain each property (predicate)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.propertyStats.length > 0
            ? (
                <div className="space-y-4">
                  {analytics.propertyStats.slice(0, 20).map((stat) => {
                    const propertyKey = `${stat.label || 'null'}:${stat.value || 'null'}`
                    const documents = analytics.documentsByProperty.get(propertyKey) || []

                    return (
                      <Collapsible key={propertyKey}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">
                              {stat.label || 'Unknown Label'}
                              :
                              {' '}
                              {stat.value || 'Unknown Value'}
                            </span>
                            {stat.isCustom && <Badge variant="secondary">Custom</Badge>}
                          </div>
                          <Badge variant="outline">
                            {documents.length}
                            {' '}
                            {documents.length === 1 ? 'document' : 'documents'}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {documents.length > 0
                            ? (
                                <div className="space-y-2">
                                  {documents.map(doc => (
                                    <Link
                                      key={doc.documentId}
                                      href={`/document/${doc.documentId}`}
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
                                </div>
                              )
                            : (
                                <p className="text-sm text-muted-foreground">No documents found</p>
                              )}
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                  {analytics.propertyStats.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Showing top 20 properties out of
                      {' '}
                      {analytics.propertyStats.length}
                    </p>
                  )}
                </div>
              )
            : (
                <p className="text-center text-muted-foreground">No properties to display</p>
              )}
        </CardContent>
      </Card>
    </>
  )
}
