import Link from 'next/link'
import { Suspense } from 'react'
import { getCorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { getCorpusWarnings } from '@/actions/analytics/warningsActions'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { AnalyticsContent } from '@/components/analytics-content'
import { AnalyticsSkeleton } from '@/components/analytics-skeleton'
import { CompletionScore, CompletionScoreSkeleton } from '@/components/completion-score'
import { Page, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'

export default async function AnalyticsPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const corpusId = (await params).corpusId
  const corpus = await getCorpus(corpusId)

  const analyticsPromise = getCorpusAnalytics(corpusId)
  const warningsPromise = getCorpusWarnings(corpusId)

  if (!corpus) {
    return (
      <Page>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
            <p className="mb-8 text-xl text-muted-foreground">Corpus not found</p>
            <Button asChild>
              <Link href="/">
                Go back home
              </Link>
            </Button>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title={corpus.title ?? ''}
        description="Completion, annotation counts, type breakdown, and constraint warnings"
      >
        <Suspense fallback={<CompletionScoreSkeleton />}>
          <CompletionScore analyticsPromise={analyticsPromise} />
        </Suspense>
      </PageHeader>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent analyticsPromise={analyticsPromise} warningsPromise={warningsPromise} />
      </Suspense>
    </Page>
  )
}
