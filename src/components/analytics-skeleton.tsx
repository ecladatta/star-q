import { BarChart3Icon, FileTextIcon, TableIcon } from 'lucide-react'

export function AnalyticsSkeleton() {
  return (
    <>
      {/* Overview Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Documents', icon: FileTextIcon },
          { label: 'Documents with Annotations', icon: BarChart3Icon },
          { label: 'Total Annotations', icon: BarChart3Icon },
          { label: 'Unique Properties', icon: TableIcon },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">{stat.label}</div>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="my-2 h-6 w-16 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>

      {/* Annotation Type Breakdown Skeleton */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-foreground">Annotation Type Breakdown</div>
        <div className="text-xs text-muted-foreground">Distribution of text-only, table-only, and joint (text+table) annotations</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="h-5 w-24 animate-pulse rounded-sm bg-muted" />
              <div className="h-8 w-12 animate-pulse rounded-sm bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Property Statistics Skeleton */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-foreground">Property Statistics</div>
        <div className="text-xs text-muted-foreground">Most frequently used properties across all annotations</div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 w-full animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
      </div>

      {/* Documents by Property Skeleton */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium text-foreground">Documents by Property</div>
        <div className="text-xs text-muted-foreground">View which documents contain each property</div>
        <div className="mt-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 w-full animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
      </div>
    </>
  )
}
