import { redirect } from 'next/navigation'
import { getPublicCorpuses } from '@/actions/corpus/corpusActions'
import { Corpuses } from '@/components/corpus'
import { getAppSettings } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function BrowsePage() {
  if (!(await getAppSettings()).setupCompletedAt) {
    redirect('/setup')
  }
  const corpuses = await getPublicCorpuses()
  return <Corpuses corpuses={corpuses} canCreate={false} ownedTeams={[]} title="Browse Corpora" description="Browse corpora shared publicly" />
}
