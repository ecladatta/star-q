import { redirect } from 'next/navigation'
import { getCorpus, getCorpusOwner, getMoveTargets, moveCorpusToTeam } from '@/actions/corpus/corpusActions'
import { CorpusMoveToTeamDialog } from '@/components/corpus-move-to-team-dialog'
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

  let dangerZone: { ownerLabel: string } | null = null
  let moveTargets: Awaited<ReturnType<typeof getMoveTargets>> = []
  if (access === 'manager') {
    const [owner, targets] = await Promise.all([
      getCorpusOwner(corpusId),
      getMoveTargets(),
    ])
    dangerZone = {
      ownerLabel: corpus.ownerType === 'user' && owner.identifier
        ? `@${owner.identifier}`
        : owner.name ?? owner.identifier ?? 'Setup pending',
    }
    moveTargets = targets
  }

  return (
    <Page>
      <PageHeader
        title={`Settings: ${corpus.title}`}
        description="Manage corpus settings and custom entities."
      />
      <CorpusSettingsPanel corpus={corpus} canManageVisibility={access === 'manager'} />
      {dangerZone && (
        <section className="mt-8 rounded-lg border border-destructive/40 bg-card">
          <div className="border-b border-destructive/40 px-4 py-3">
            <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Move to another team</p>
              <p className="text-xs text-muted-foreground">
                This corpus is currently owned by
                {' '}
                {dangerZone.ownerLabel}
                . Moving hands full control to the target team.
              </p>
            </div>
            <CorpusMoveToTeamDialog
              teams={moveTargets}
              title="Move corpus to a team"
              description={(
                <>
                  This corpus is currently owned by
                  {' '}
                  <strong>{dangerZone.ownerLabel}</strong>
                  . Moving hands full control to the target team.
                </>
              )}
              confirmLabel="Move corpus"
              triggerLabel="Move to a team"
              action={async (teamId) => {
                'use server'
                await moveCorpusToTeam(corpusId, teamId)
              }}
            />
          </div>
        </section>
      )}
    </Page>
  )
}
