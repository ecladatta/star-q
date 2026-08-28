import { redirect } from 'next/navigation'
import { getMyCorpora } from '@/actions/corpus/corpusActions'
import { getOwnedTeams } from '@/actions/team/teamActions'
import { auth } from '@/auth'
import { Corpora } from '@/components/corpus'
import { getAppSettings } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function CorporaPage() {
  const [settings, session] = await Promise.all([getAppSettings(), auth()])
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }
  if (!session?.user?.valid) {
    redirect('/explore')
  }
  if (!session.user.username) {
    redirect('/onboarding')
  }
  if (session.user.mustChangePassword) {
    redirect('/account/password')
  }
  const corpora = await getMyCorpora()
  const canCreate = true
  const ownedTeams = await getOwnedTeams()
  return <Corpora corpora={corpora} canCreate={canCreate} ownedTeams={ownedTeams} title="My corpora" description="Corpora you own or collaborate on" />
}
