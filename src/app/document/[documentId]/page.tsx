import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getDocumentWarnings } from '@/actions/analytics/warningsActions'
import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocument, getDocumentsMetadata } from '@/actions/document/documentActions'
import { auth } from '@/auth'
import { DocumentViewer } from '@/components/document-viewer'
import { WikidataWarningsSection, WikidataWarningsSkeleton } from '@/components/wikidata-warnings-section'
import { getAppSettings } from '@/lib/app-settings'
import { getCorpusAccess } from '@/lib/corpus-access'

export default async function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  if (!(await getAppSettings()).setupCompletedAt)
    redirect('/setup')
  const session = await auth()
  if (session?.user?.valid && !session.user.username)
    redirect('/onboarding')
  if (session?.user?.valid && session.user.mustChangePassword)
    redirect('/account/password')
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
  const access = await getCorpusAccess(document.corpusId)
  const edit = access === 'editor' || access === 'manager'
  const documentsList = await getDocumentsMetadata(document.corpusId)
  const annotations = await getAnnotations(documentId)

  return (
    <DocumentViewer
      corpus={corpus}
      documents={documentsList}
      document={document}
      annotations={annotations}
      readOnly={!edit}
      warningsSlot={(
        <Suspense key={documentId} fallback={<WikidataWarningsSkeleton compact />}>
          <WikidataWarningsSection
            warningsPromise={getDocumentWarnings(documentId)}
            groupByDocument={false}
            compact
          />
        </Suspense>
      )}
    />
  )
}
