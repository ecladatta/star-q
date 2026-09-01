import { redirect } from 'next/navigation'
import { cancelCorpusOwnershipTransfer, getCorpus, getCorpusOwner, getPendingCorpusOwnershipTransfer, transferCorpusOwnership } from '@/actions/corpus/corpusActions'
import { CorpusSettingsPanel } from '@/components/corpus-settings-panel'
import { CorpusTransferOwnershipDialog } from '@/components/corpus-transfer-ownership-dialog'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { requirePageUser } from '@/lib/auth-utils'
import { getCorpusAccess } from '@/lib/corpus-access'

export const dynamic = 'force-dynamic'

export default async function CorpusSettingsPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  const actor = await requirePageUser()
  const isAdmin = actor.role === 'admin'
  const access = await getCorpusAccess(corpusId)
  const canEdit = access === 'editor' || access === 'manager'
  if (!canEdit) {
    redirect(`/corpus/${corpusId}`)
  }
  const corpus = await getCorpus(corpusId)
  const transferEffectCopy = isAdmin
    ? 'Changing the owner takes effect immediately.'
    : 'The target must accept before ownership changes.'

  let dangerZone: { ownerLabel: string, pendingTransfer: Awaited<ReturnType<typeof getPendingCorpusOwnershipTransfer>> } | null = null
  if (access === 'manager') {
    const [owner, pendingTransfer] = await Promise.all([
      getCorpusOwner(corpusId),
      getPendingCorpusOwnershipTransfer(corpusId),
    ])
    dangerZone = {
      ownerLabel: corpus.ownerType === 'user' && owner.identifier
        ? `@${owner.identifier}`
        : owner.name ?? owner.identifier ?? 'Setup pending',
      pendingTransfer,
    }
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
          {dangerZone.pendingTransfer && (
            <div className="flex items-center justify-between gap-4 border-b border-destructive/40 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Transfer pending</p>
                <p className="text-xs text-muted-foreground">
                  Waiting for
                  {' '}
                  {dangerZone.pendingTransfer.username
                    ? `@${dangerZone.pendingTransfer.username}`
                    : dangerZone.pendingTransfer.teamName ?? dangerZone.pendingTransfer.teamSlug}
                  {' '}
                  to accept.
                </p>
              </div>
              <ServerActionForm action={cancelCorpusOwnershipTransfer.bind(null, dangerZone.pendingTransfer.id)}>
                <Button type="submit" variant="outline" size="sm">Cancel</Button>
              </ServerActionForm>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Transfer to another user</p>
              <p className="text-xs text-muted-foreground">
                This corpus is currently owned by
                {' '}
                {dangerZone.ownerLabel}
                . Transferring hands full control to another user.
                {' '}
                {transferEffectCopy}
              </p>
            </div>
            <CorpusTransferOwnershipDialog
              title="Transfer corpus to another user"
              description={(
                <>
                  This corpus is currently owned by
                  {' '}
                  <strong>{dangerZone.ownerLabel}</strong>
                  . Transferring hands full control to another user.
                  {' '}
                  {transferEffectCopy}
                  {' '}
                  Type the exact username to confirm.
                </>
              )}
              confirmLabel="Transfer ownership"
              inputLabel="Exact username"
              placeholder="Type the exact username"
              triggerLabel="Transfer to a user"
              action={async (identifier) => {
                'use server'
                await transferCorpusOwnership(corpusId, 'user', identifier)
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-destructive/40 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Transfer to another team</p>
              <p className="text-xs text-muted-foreground">
                This corpus is currently owned by
                {' '}
                {dangerZone.ownerLabel}
                . Transferring hands full control to another team.
                {' '}
                {transferEffectCopy}
              </p>
            </div>
            <CorpusTransferOwnershipDialog
              title="Transfer corpus to another team"
              description={(
                <>
                  This corpus is currently owned by
                  {' '}
                  <strong>{dangerZone.ownerLabel}</strong>
                  . Transferring hands full control to another team.
                  {' '}
                  {transferEffectCopy}
                  {' '}
                  Type the exact team slug to confirm.
                </>
              )}
              confirmLabel="Transfer ownership"
              inputLabel="Exact team slug"
              placeholder="Type the exact team slug"
              triggerLabel="Transfer to a team"
              action={async (identifier) => {
                'use server'
                await transferCorpusOwnership(corpusId, 'team', identifier)
              }}
            />
          </div>
        </section>
      )}
    </Page>
  )
}
