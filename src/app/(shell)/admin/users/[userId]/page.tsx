import type { UserRole } from '@/db/schema'
import { deleteAdminManagedUser, getAdminUser, getUserDeletionImpact, resetUserPassword, setUserBlocked, updateAdminManagedUser } from '@/actions/admin/adminActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isLocalCredentialsEnabled } from '@/lib/app-settings'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [user, impact] = await Promise.all([getAdminUser(userId), getUserDeletionImpact(userId)])
  return (
    <Page>
      <PageHeader
        title={user.name ?? user.username ?? 'User'}
        description={(
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">
              @
              {user.username ?? 'no username'}
            </span>
            <span className={cn('inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize', user.role === 'admin' ? 'text-foreground' : 'text-muted-foreground')}>
              {user.role}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{user.id}</span>
          </span>
        )}
      />
      <section className="max-w-2xl rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">Account</h2>
        <ServerActionForm
          action={async (formData) => {
            'use server'
            await updateAdminManagedUser(user.id, { name: String(formData.get('name')), username: String(formData.get('username')), role: String(formData.get('role')) as UserRole })
          }}
          className="space-y-4"
          successMessage="User updated"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" name="name" defaultValue={user.name ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={user.username ?? ''} required />
          </div>
          <div className="flex items-center gap-3">
            <select name="role" defaultValue={user.role} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit">Save</Button>
          </div>
        </ServerActionForm>
      </section>
      {isLocalCredentialsEnabled() && (
        <section className="mt-6 max-w-2xl rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Temporary password</h2>
          <ServerActionForm
            action={async (formData) => {
              'use server'
              await resetUserPassword(user.id, String(formData.get('temporaryPassword')))
            }}
            className="flex gap-3"
          >
            <Input name="temporaryPassword" type="password" minLength={4} required placeholder="New temporary password" />
            <Button type="submit">Reset and revoke sessions</Button>
          </ServerActionForm>
        </section>
      )}
      <section className="mt-6 max-w-2xl space-y-4 rounded-lg border border-destructive/30 bg-card p-4">
        <h2 className="text-sm font-medium">Danger zone</h2>
        <ConfirmActionButton
          action={async () => {
            'use server'
            await setUserBlocked(user.id, user.status !== 'blocked')
          }}
          title={user.status === 'blocked' ? 'Unblock user?' : 'Block user?'}
          description={user.status === 'blocked'
            ? 'This will allow the user to sign in again.'
            : 'This will revoke all active sessions and prevent the user from signing in.'}
          confirmLabel={user.status === 'blocked' ? 'Unblock user' : 'Block user'}
          variant="outline"
        >
          {user.status === 'blocked' ? 'Unblock user' : 'Block and revoke sessions'}
        </ConfirmActionButton>
        <p className="text-xs text-muted-foreground">
          {`Deletion removes ${impact.personalCorpora} personal corpus/corpora, ${impact.soleOwnedTeams} sole-owned team(s), and ${impact.teamCorpora} team corpus/corpora.`}
        </p>
        <ConfirmActionButton
          action={async () => {
            'use server'
            await deleteAdminManagedUser(user.id)
          }}
          title="Permanently delete user?"
          description="This will permanently delete the user and all dependent data. This action cannot be undone."
          confirmLabel="Delete user"
          variant="destructive"
        >
          Permanently delete user and dependent data
        </ConfirmActionButton>
      </section>
    </Page>
  )
}
