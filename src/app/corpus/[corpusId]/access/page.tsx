import type { CorpusCollaboratorRole } from '@/db/schema'
import { getCorpusCollaborations, inviteTeamToCorpus, inviteUserToCorpus, revokeCorpusCollaboration, updateCorpusCollaboratorRole } from '@/actions/collaboration/collaborationActions'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requirePageUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export default async function CorpusAccessPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  await requirePageUser()
  const [resource, collaborations] = await Promise.all([getCorpus(corpusId), getCorpusCollaborations(corpusId)])
  return (
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">
          Access:
          {resource.title}
        </h1>
        <p className="text-sm text-muted-foreground">Invite existing users or teams. Access begins after acceptance.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <InviteForm
          title="Invite a user"
          label="Exact username"
          field="username"
          action={async (value, role) => {
            'use server'
            await inviteUserToCorpus(corpusId, value, role)
          }}
        />
        <InviteForm
          title="Invite a team"
          label="Exact team slug"
          field="slug"
          action={async (value, role) => {
            'use server'
            await inviteTeamToCorpus(corpusId, value, role)
          }}
        />
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Collaborators</h2>
        {collaborations.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">{item.targetUserId ? `@${item.username}` : item.teamName}</p>
              <p className="text-sm text-muted-foreground">
                {item.targetTeamId ? `Team: ${item.teamSlug}` : 'User'}
                {' '}
                ·
                {' '}
                {item.status}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ServerActionForm action={async () => {
                'use server'
                await updateCorpusCollaboratorRole(item.id, item.role === 'viewer' ? 'editor' : 'viewer')
              }}
              >
                <Button type="submit" variant="outline" size="sm">{item.role}</Button>
              </ServerActionForm>
              <ServerActionForm action={async () => {
                'use server'
                await revokeCorpusCollaboration(item.id)
              }}
              >
                <Button type="submit" variant="destructive" size="sm">Revoke</Button>
              </ServerActionForm>
            </div>
          </div>
        ))}
        {!collaborations.length && <p className="text-sm text-muted-foreground">No collaborators yet.</p>}
      </section>
    </main>
  )
}

function InviteForm({ title, label, field, action }: { title: string, label: string, field: string, action: (value: string, role: CorpusCollaboratorRole) => Promise<void> }) {
  return (
    <section className="rounded-md border p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <ServerActionForm
        action={async (formData) => {
          'use server'
          await action(String(formData.get(field)), String(formData.get('role')) as CorpusCollaboratorRole)
        }}
        className="space-y-4"
        successMessage="Invitation sent"
      >
        <div className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input id={field} name={field} required />
        </div>
        <select name="role" className="h-8 w-full rounded-md border bg-background px-3 text-sm">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <Button type="submit">Send invitation</Button>
      </ServerActionForm>
    </section>
  )
}
