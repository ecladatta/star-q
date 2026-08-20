import Link from 'next/link'
import { Suspense } from 'react'
import { getDocumentWarnings } from '@/actions/analytics/warningsActions'
import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocument, getDocumentsMetadata } from '@/actions/document/documentActions'
import { DocumentViewer } from '@/components/document-viewer'
import { WikidataWarningsSection, WikidataWarningsSkeleton } from '@/components/wikidata-warnings-section'

export default async function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  const document = await getDocument(documentId)

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">404</h1>
          <p className="mb-8 text-xl text-gray-600">Document not found</p>
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

  const corpus = await getCorpus(document.corpusId)
  const documentsList = await getDocumentsMetadata(document.corpusId)
  const annotations = await getAnnotations(documentId)

  return (
    <DocumentViewer
      corpus={corpus}
      documents={documentsList}
      document={document}
      annotations={annotations}
      warningsSlot={(
        <Suspense key={documentId} fallback={<WikidataWarningsSkeleton />}>
          <WikidataWarningsSection
            warningsPromise={getDocumentWarnings(documentId)}
            groupByDocument={false}
          />
        </Suspense>
      )}
    />
  )
}
