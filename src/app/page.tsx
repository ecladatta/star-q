import { redirect } from 'next/navigation'
import { getMyCorpuses } from '@/actions/corpus/corpusActions'
import { getOwnedTeams } from '@/actions/team/teamActions'
import { auth } from '@/auth'
import { Corpuses } from '@/components/corpus'
import { getAppSettings } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function CorpusesPage() {
  const [settings, session] = await Promise.all([getAppSettings(), auth()])
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }
  if (!session?.user?.valid) {
    redirect('/browse')
  }
  if (!session.user.username) {
    redirect('/onboarding')
  }
  if (session.user.mustChangePassword) {
    redirect('/account/password')
  }
  const corpuses = await getMyCorpuses()
  const canCreate = true
  const ownedTeams = await getOwnedTeams()
  return <Corpuses corpuses={corpuses} canCreate={canCreate} ownedTeams={ownedTeams} title="My corpora" description="Corpora you own or collaborate on" />
}
