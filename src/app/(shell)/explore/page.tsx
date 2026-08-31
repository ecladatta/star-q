import { redirect } from 'next/navigation'
import { getPublicCorpora } from '@/actions/corpus/corpusActions'
import { getOwnedTeams } from '@/actions/team/teamActions'
import { auth } from '@/auth'
import { Corpora } from '@/components/corpus'
import { getAppSettings } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  if (!(await getAppSettings()).setupCompletedAt) {
    redirect('/setup')
  }
  const session = await auth()
  const signedIn = Boolean(session?.user?.valid && session.user.username && !session.user.mustChangePassword)
  const ownedTeams = signedIn ? await getOwnedTeams() : []
  const corpora = await getPublicCorpora()
  const corpusLabel = corpora.length === 1 ? 'corpus' : 'corpora'
  return <Corpora corpora={corpora} canCreate={false} canCopy={signedIn} ownedTeams={ownedTeams} title="Explore" description={`${corpora.length} public ${corpusLabel} shared on this instance. Open one to read its documents and annotations.`} />
}
