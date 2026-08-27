import type { TeamRole } from '@/db/schema'
import { cancelTeamInvitation, deleteTeam, getTeamBySlug, inviteTeamMember, leaveTeam, removeTeamMember, updateTeamMemberRole } from '@/actions/team/teamActions'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const dynamic = 'force-dynamic'

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getTeamBySlug(slug)
  const canManage = data.membershipRole === 'owner'
  return (
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">{data.team.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.team.slug}
          {' '}
          · Your role:
          {' '}
          {data.membershipRole}
        </p>
      </div>
      {canManage && (
        <section className="rounded-md border p-5">
          <h2 className="mb-4 text-lg font-semibold">Invite an existing user</h2>
          <ServerActionForm
            action={async (formData) => {
              'use server'
              await inviteTeamMember(data.team.id, String(formData.get('username')), String(formData.get('role')) as TeamRole)
            }}
            className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Exact username</Label>
              <Input id="username" name="username" required />
            </div>
            <select name="role" className="h-8 rounded-md border bg-background px-3 text-sm">
              <option value="member">Member</option>
              <option value="owner">Owner</option>
            </select>
            <Button type="submit">Invite</Button>
          </ServerActionForm>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Members</h2>
        {data.members.map(member => (
          <div key={member.userId} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-sm text-muted-foreground">
                @
                {member.username}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm capitalize">{member.role}</span>
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
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Invitations</h2>
          {data.invitations.map(invitation => (
            <div key={invitation.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>
                @
                {invitation.username}
                {' '}
                ·
                {invitation.role}
                {' '}
                ·
                {invitation.status}
              </span>
              {invitation.status === 'pending' && (
                <ServerActionForm action={cancelTeamInvitation.bind(null, invitation.id)}>
                  <Button type="submit" variant="outline" size="sm">Cancel</Button>
                </ServerActionForm>
              )}
            </div>
          ))}
        </section>
      )}
      <section className="flex justify-end gap-3 border-t pt-6">
        <ServerActionForm action={async () => {
          'use server'
          await leaveTeam(data.team.id)
        }}
        >
          <Button type="submit" variant="outline">Leave team</Button>
        </ServerActionForm>
        {canManage && (
          <ServerActionForm action={async () => {
            'use server'
            await deleteTeam(data.team.id)
          }}
          >
            <Button type="submit" variant="destructive">Delete team and its corpora</Button>
          </ServerActionForm>
        )}
      </section>
    </main>
  )
}
