import Link from 'next/link'
import { Suspense } from 'react'
import { getCorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { AnalyticsContent } from '@/components/analytics-content'
import { AnalyticsSkeleton } from '@/components/analytics-skeleton'
import { CompletionScore, CompletionScoreSkeleton } from '@/components/completion-score'
import { Button } from '@/components/ui/button'

export default async function AnalyticsPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const corpusId = (await params).corpusId
  const corpus = await getCorpus(corpusId)

  const analyticsPromise = getCorpusAnalytics(corpusId)

  if (!corpus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">404</h1>
          <p className="mb-8 text-xl text-gray-600">Corpus not found</p>
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {corpus.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed analytics about this corpus
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Suspense fallback={<CompletionScoreSkeleton />}>
            <CompletionScore analyticsPromise={analyticsPromise} />
          </Suspense>
          <Link href={`/corpus/${corpusId}`}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Back to Corpus</Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent analyticsPromise={analyticsPromise} />
      </Suspense>
    </div>
  )
}
