import { BarChart3Icon } from 'lucide-react'
import Link from 'next/link'
import React, { Suspense } from 'react'
import { getCorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { getCorpus, getCorpusAnnotationsCount } from '@/actions/corpus/corpusActions'
import { getDocumentsMetadata } from '@/actions/document/documentActions'
import { CompletionScore, CompletionScoreSkeleton } from '@/components/completion-score'
import CorpusSettingsButton from '@/components/corpus-settings-button'
import DocumentsTable from '@/components/documents-table'
import { Button } from '@/components/ui/button'

export default async function CorpusPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const corpusId = (await params).corpusId
  const documentsList = await getDocumentsMetadata(corpusId)
  const corpus = await getCorpus(corpusId)
  const totalAnnotations = await getCorpusAnnotationsCount(corpusId)
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
    <div className="container mx-auto flex size-full min-h-screen max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Corpus:
            {' '}
            {corpus.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a document to start annotating
          </p>
          <p className="mt-2 text-sm font-medium text-gray-700">
            Total annotations:
            {' '}
            {totalAnnotations}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<CompletionScoreSkeleton />}>
            <CompletionScore analyticsPromise={analyticsPromise} />
          </Suspense>
          <Link href={`/corpus/${corpusId}/analytics`}>
            <Button variant="outline">
              <BarChart3Icon className="mr-2 size-4" />
              Analytics
            </Button>
          </Link>
          <CorpusSettingsButton corpus={corpus} />
        </div>
      </div>
      <DocumentsTable documents={documentsList} />
    </div>
  )
}
