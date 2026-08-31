import { MoreVerticalIcon } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { getCorpus, getCorpusAnnotationsCount, getCorpusOwner } from '@/actions/corpus/corpusActions'
import { getDocumentsMetadata } from '@/actions/document/documentActions'
import { getOwnedTeams } from '@/actions/team/teamActions'
import { auth } from '@/auth'
import { CompletionScore, CompletionScoreSkeleton } from '@/components/completion-score'
import { CorpusActions } from '@/components/corpus-actions'
import DocumentsTable from '@/components/documents-table'
import { Page, PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAppSettings } from '@/lib/app-settings'
import { getCorpusAccess } from '@/lib/corpus-access'

export default async function CorpusPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const corpusId = (await params).corpusId
  if (!(await getAppSettings()).setupCompletedAt) {
    redirect('/setup')
  }
  const session = await auth()
  if (session?.user?.valid && !session.user.username)
    redirect('/onboarding')
  if (session?.user?.valid && session.user.mustChangePassword)
    redirect('/account/password')
  const signedIn = Boolean(session?.user?.valid)
  const ownedTeams = signedIn ? await getOwnedTeams() : []
  const access = await getCorpusAccess(corpusId)
  const edit = access === 'editor' || access === 'manager'
  const documentsList = await getDocumentsMetadata(corpusId)
  const corpus = await getCorpus(corpusId)
  const owner = await getCorpusOwner(corpusId)
  const totalAnnotations = await getCorpusAnnotationsCount(corpusId)
  const analyticsPromise = getCorpusAnalytics(corpusId)

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
        titleBadge={(
          <Badge variant="secondary" className="shrink-0">
            {corpus.visibility === 'public' ? 'Public' : 'Private'}
          </Badge>
        )}
        description={(
          <>
            Select a document to start annotating
            <br />
            Owner:
            {' '}
            {owner.identifier ? `@${owner.identifier}` : 'Setup pending'}
            <br />
            Total annotations:
            {' '}
            <span className="font-medium text-foreground">{totalAnnotations}</span>
          </>
        )}
      >
        <Link href={`/corpus/${corpusId}/analytics`}>
          <Suspense fallback={<CompletionScoreSkeleton />}>
            <CompletionScore analyticsPromise={analyticsPromise} />
          </Suspense>
        </Link>
        <CorpusActions
          corpus={corpus}
          access={access!}
          showOpenAction={false}
          ownedTeams={ownedTeams}
          canCopy={signedIn}
          triggerButton={(
            <Button variant="outline" size="sm">
              <MoreVerticalIcon className="mr-2 size-4" />
              Actions
            </Button>
          )}
        />
      </PageHeader>
      <DocumentsTable documents={documentsList} canEdit={edit} />
    </Page>
  )
}
