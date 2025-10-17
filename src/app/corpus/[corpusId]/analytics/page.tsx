import Link from 'next/link'
import React, { Suspense } from 'react'
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
    <div className="container mx-auto flex size-full min-h-screen max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {corpus.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed analytics about this corpus
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={<CompletionScoreSkeleton />}>
            <CompletionScore analyticsPromise={analyticsPromise} />
          </Suspense>
          <Link href={`/corpus/${corpusId}`}>
            <Button variant="outline">Back to Corpus</Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent analyticsPromise={analyticsPromise} />
      </Suspense>
    </div>
  )
}
