import type { CorpusCollaboratorRole } from '@/db/schema'
import { getCorpusCollaborations, inviteTeamToCorpus, inviteUserToCorpus, revokeCorpusCollaboration } from '@/actions/collaboration/collaborationActions'
import { getCorpus, getCorpusOwner, transferCorpusOwnership } from '@/actions/corpus/corpusActions'
import { CorpusCollaboratorRoleSelect } from '@/components/corpus-collaborator-role-select'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requirePageUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export default async function CorpusAccessPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  const actor = await requirePageUser()
  const isAdmin = actor.role === 'admin'
  const [resource, owner, collaborations] = await Promise.all([getCorpus(corpusId), getCorpusOwner(corpusId), getCorpusCollaborations(corpusId)])
  const ownerLabel = resource.ownerType === 'user' && owner.identifier
    ? `@${owner.identifier}`
    : owner.name ?? owner.identifier ?? 'Setup pending'
  return (
    <Page>
      <PageHeader
        title={`Access: ${resource.title}`}
        description={isAdmin
          ? 'Add existing users or teams. Access is granted immediately.'
          : 'Invite existing users or teams. Access begins after acceptance.'}
      />
      <section className="mb-5 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Ownership</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Current owner:
          {' '}
          <span className="font-medium text-foreground">{ownerLabel}</span>
          .
          {' '}
          {isAdmin
            ? 'Changing the owner takes effect immediately.'
            : 'A transfer takes effect immediately, and you may lose access to this corpus.'}
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <OwnershipForm
            title={isAdmin ? 'Change to a user' : 'Transfer to a user'}
            label="Exact username"
            field="username"
            submitLabel={isAdmin ? 'Change owner' : 'Transfer ownership'}
            action={async (value) => {
              'use server'
              await transferCorpusOwnership(corpusId, 'user', value)
            }}
          />
          <OwnershipForm
            title={isAdmin ? 'Change to a team' : 'Transfer to a team'}
            label="Exact team slug"
            field="slug"
            submitLabel={isAdmin ? 'Change owner' : 'Transfer ownership'}
            action={async (value) => {
              'use server'
              await transferCorpusOwnership(corpusId, 'team', value)
            }}
          />
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <InviteForm
          title={isAdmin ? 'Add a user' : 'Invite a user'}
          label="Exact username"
          field="username"
          grantsImmediately={isAdmin}
          action={async (value, role) => {
            'use server'
            await inviteUserToCorpus(corpusId, value, role)
          }}
        />
        <InviteForm
          title={isAdmin ? 'Add a team' : 'Invite a team'}
          label="Exact team slug"
          field="slug"
          grantsImmediately={isAdmin}
          action={async (value, role) => {
            'use server'
            await inviteTeamToCorpus(corpusId, value, role)
          }}
        />
      </div>
      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Collaborators</h2>
        {collaborations.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[13px] font-medium text-secondary-foreground">
                {(item.targetUserId ? item.username : item.teamName)?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {item.targetUserId ? `@${item.username}` : item.teamName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.targetTeamId ? `Team: ${item.teamSlug}` : 'User'}
                  {' '}
                  ·
                  {' '}
                  {item.status}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CorpusCollaboratorRoleSelect collaborationId={item.id} role={item.role} />
              <ServerActionForm action={async () => {
                'use server'
                await revokeCorpusCollaboration(item.id)
              }}
              >
                <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  {isAdmin ? 'Remove' : 'Revoke'}
                </Button>
              </ServerActionForm>
            </div>
          </div>
        ))}
        {!collaborations.length && <p className="text-sm text-muted-foreground">No collaborators yet.</p>}
      </section>
    </Page>
  )
}

function OwnershipForm({ title, label, field, submitLabel, action }: { title: string, label: string, field: string, submitLabel: string, action: (value: string) => Promise<void> }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">{title}</h3>
      <ServerActionForm
        action={async (formData) => {
          'use server'
          await action(String(formData.get(field)))
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor={`owner-${field}`}>{label}</Label>
          <Input id={`owner-${field}`} name={field} required />
        </div>
        <Button type="submit" variant="outline">{submitLabel}</Button>
      </ServerActionForm>
    </div>
  )
}

function InviteForm({ title, label, field, grantsImmediately, action }: { title: string, label: string, field: string, grantsImmediately: boolean, action: (value: string, role: CorpusCollaboratorRole) => Promise<void> }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 text-sm font-medium text-foreground">{title}</h2>
      <ServerActionForm
        action={async (formData) => {
          'use server'
          await action(String(formData.get(field)), String(formData.get('role')) as CorpusCollaboratorRole)
        }}
        className="space-y-4"
        successMessage={grantsImmediately ? 'Access granted' : 'Invitation sent'}
      >
        <div className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input id={field} name={field} required />
        </div>
        <select name="role" className="h-8 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <Button type="submit">{grantsImmediately ? 'Add' : 'Send invitation'}</Button>
      </ServerActionForm>
    </section>
  )
}
