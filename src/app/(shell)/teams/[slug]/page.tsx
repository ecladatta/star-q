import { cancelTeamInvitation, deleteTeam, getTeamBySlug, inviteTeamMember, leaveTeam, removeTeamMember, updateTeamMemberRole } from '@/actions/team/teamActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRequiredString } from '@/lib/form-data'
import { validateTeamRole } from '@/lib/identity'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function statusPillClass(status: string) {
  return cn(
    'inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px]',
    status === 'accepted' ? 'text-success' : 'text-muted-foreground',
  )
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getTeamBySlug(slug)
  const canManage = data.canManage
  return (
    <Page>
      <PageHeader
        title={data.team.name}
        description={`${data.team.slug} · Your role: ${data.membershipRole ?? 'Administrator'}`}
      />
      {canManage && (
        <section className="mb-6 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium">Invite an existing user</h2>
          <ServerActionForm
            action={async (formData) => {
              'use server'
              await inviteTeamMember(data.team.id, getRequiredString(formData, 'username'), validateTeamRole(getRequiredString(formData, 'role')))
            }}
            className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Exact username</Label>
              <Input id="username" name="username" required />
            </div>
            <select name="role" className="h-8 rounded-md border border-input bg-background px-3 text-sm">
              <option value="member">Member</option>
              <option value="owner">Owner</option>
            </select>
            <Button type="submit">Invite</Button>
          </ServerActionForm>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Members</h2>
        {data.members.map(member => (
          <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-[13px] font-medium">
                {(member.name ?? member.username ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{member.name ?? member.username}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @
                  {member.username}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
              {canManage && (
                <>
                  <ServerActionForm action={async () => {
                    'use server'
                    await updateTeamMemberRole(data.team.id, member.userId, member.role === 'owner' ? 'member' : 'owner')
                  }}
                  >
                    <Button type="submit" variant="outline" size="sm">{member.role === 'owner' ? 'Make member' : 'Make owner'}</Button>
                  </ServerActionForm>
                  <ServerActionForm action={async () => {
                    'use server'
                    await removeTeamMember(data.team.id, member.userId)
                  }}
                  >
                    <Button type="submit" variant="destructive" size="sm">Remove</Button>
                  </ServerActionForm>
                </>
              )}
            </div>
          </div>
        ))}
      </section>
      {canManage && data.invitations.length > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-sm font-medium">Invitations</h2>
          {data.invitations.map(invitation => (
            <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-[13px] font-medium">
                  {(invitation.name ?? invitation.username ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">
                    @
                    {invitation.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground capitalize">
                    {invitation.role}
                    {' '}
                    role
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={statusPillClass(invitation.status)}>{invitation.status}</span>
                {invitation.status === 'pending' && (
                  <ServerActionForm action={cancelTeamInvitation.bind(null, invitation.id)}>
                    <Button type="submit" variant="outline" size="sm">Cancel</Button>
                  </ServerActionForm>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="mt-8 flex justify-end gap-3 border-t border-border pt-6">
        {data.membershipRole && (
          <ConfirmActionButton
            action={async () => {
              'use server'
              await leaveTeam(data.team.id)
            }}
            title="Leave team?"
            description={(
              <>
                You are about to leave
                {' '}
                <strong>{data.team.name}</strong>
                . You will lose access to its corpora unless another member shares them with you.
              </>
            )}
            confirmLabel="Leave team"
            variant="outline"
          >
            Leave team
          </ConfirmActionButton>
        )}
        {canManage && (
          <ConfirmActionButton
            action={async () => {
              'use server'
              await deleteTeam(data.team.id)
            }}
            title="Delete team and its corpora?"
            description={(
              <>
                This will permanently delete
                {' '}
                <strong>{data.team.name}</strong>
                {' '}
                and all of its corpora, documents, and annotations. This action cannot be undone.
              </>
            )}
            confirmLabel="Delete team"
            variant="destructive"
          >
            Delete team and its corpora
          </ConfirmActionButton>
        )}
      </section>
    </Page>
  )
}
