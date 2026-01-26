import type { CorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { Skeleton } from '@/components/ui/skeleton'

type CompletionScoreProps = {
  analyticsPromise: Promise<CorpusAnalytics>
}

export function CompletionScoreSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-2">
      <Skeleton className="size-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export async function CompletionScore({ analyticsPromise }: CompletionScoreProps) {
  const analytics = await analyticsPromise

  const calculateCompletionScore = () => {
    if (analytics.totalDocuments === 0) {
      return 0
    }

    const completedDocsScore = (analytics.completedDocuments / analytics.totalDocuments) * 60

    const totalUnassignedPredicates = analytics.documentsWithUnassignedPredicates.reduce(
      (sum, doc) => sum + doc.unassignedPredicateCount,
      0,
    )
    const assignedPredicatesScore = analytics.totalAnnotations > 0
      ? ((analytics.totalAnnotations - totalUnassignedPredicates) / analytics.totalAnnotations) * 20
      : 20

    const totalUnassignedSubjects = analytics.documentsWithUnassignedSubjects.reduce(
      (sum, doc) => sum + doc.unassignedSubjectCount,
      0,
    )

    const assignedSubjectsScore = analytics.totalAnnotations > 0
      ? ((analytics.totalAnnotations - totalUnassignedSubjects) / analytics.totalAnnotations) * 20
      : 20

    return Math.round(completedDocsScore + assignedPredicatesScore + assignedSubjectsScore)
  }

  const completionScore = calculateCompletionScore()

  const totalUnassignedPredicates = analytics.documentsWithUnassignedPredicates.reduce(
    (sum, doc) => sum + doc.unassignedPredicateCount,
    0,
  )
  const totalUnassignedSubjects = analytics.documentsWithUnassignedSubjects.reduce(
    (sum, doc) => sum + doc.unassignedSubjectCount,
    0,
  )

  const getScoreColor = (score: number) => {
    if (score >= 80) {
      return 'text-green-600 dark:text-green-400'
    }
    if (score >= 60) {
      return 'text-yellow-600 dark:text-yellow-400'
    }
    if (score >= 40) {
      return 'text-orange-600 dark:text-orange-400'
    }
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="group relative">
      <div className="flex items-center gap-3 rounded-lg px-4 py-2">
        <div className="relative">
          <svg className="size-10" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted"
              opacity="0.2"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className={getScoreColor(completionScore)}
              strokeDasharray={`${(completionScore / 100) * 100.53} 100.53`}
              strokeDashoffset="0"
              transform="rotate(-90 20 20)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${getScoreColor(completionScore)}`}>
              {completionScore}
            </span>
          </div>
        </div>

        <div className="text-sm">
          <div className="font-medium text-foreground">Completion</div>
          <div className="text-xs text-muted-foreground">
            {analytics.completedDocuments}
            /
            {analytics.totalDocuments}
            {' '}
            docs
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-80 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
          <div className="mb-2 text-sm font-semibold">Score Breakdown:</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed documents:</span>
              <span className="font-medium">
                {analytics.completedDocuments}
                /
                {analytics.totalDocuments}
                {' '}
                •
                {' '}
                {analytics.totalDocuments > 0 ? Math.round((analytics.completedDocuments / analytics.totalDocuments) * 100) : 0}
                %
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned predicates:</span>
              <span className="font-medium">
                {analytics.totalAnnotations > 0
                  ? `${analytics.totalAnnotations - totalUnassignedPredicates}/${analytics.totalAnnotations} • ${Math.round(((analytics.totalAnnotations - totalUnassignedPredicates) / analytics.totalAnnotations) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned subjects:</span>
              <span className="font-medium">
                {analytics.totalAnnotations > 0
                  ? `${analytics.totalAnnotations - totalUnassignedSubjects}/${analytics.totalAnnotations} • ${Math.round(((analytics.totalAnnotations - totalUnassignedSubjects) / analytics.totalAnnotations) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
