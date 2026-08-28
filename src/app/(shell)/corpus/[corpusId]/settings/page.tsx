import { redirect } from 'next/navigation'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { CorpusSettingsPanel } from '@/components/corpus-settings-panel'
import { Page, PageHeader } from '@/components/page'
import { requirePageUser } from '@/lib/auth-utils'
import { getCorpusAccess } from '@/lib/corpus-access'

export const dynamic = 'force-dynamic'

export default async function CorpusSettingsPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  await requirePageUser()
  const access = await getCorpusAccess(corpusId)
  const canEdit = access === 'editor' || access === 'manager'
  if (!canEdit) {
    redirect(`/corpus/${corpusId}`)
  }
  const corpus = await getCorpus(corpusId)
  return (
    <Page>
      <PageHeader
        title={`Settings: ${corpus.title}`}
        description="Manage corpus settings and custom entities."
      />
      <CorpusSettingsPanel corpus={corpus} canManageVisibility={access === 'manager'} />
    </Page>
  )
}
