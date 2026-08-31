import type { UserRole } from '@/db/schema'
import { deleteAdminManagedUser, getAdminUser, getUserDeletionImpact, resetUserPassword, setUserBlocked, updateAdminManagedUser } from '@/actions/admin/adminActions'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isLocalCredentialsEnabled } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [user, impact] = await Promise.all([getAdminUser(userId), getUserDeletionImpact(userId)])
  return (
    <main className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">{user.name ?? user.username ?? 'User'}</h1>
        <p className="text-sm text-muted-foreground">
          User ID:
          {user.id}
        </p>
      </div>
      <section className="rounded-md border p-5">
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
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
          <select name="role" defaultValue={user.role} className="h-8 rounded-md border bg-background px-3 text-sm">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit">Save</Button>
        </ServerActionForm>
      </section>
      {isLocalCredentialsEnabled() && (
        <section className="rounded-md border p-5">
          <h2 className="mb-4 text-lg font-semibold">Temporary password</h2>
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
      <section className="space-y-4 rounded-md border border-red-200 p-5">
        <h2 className="text-lg font-semibold">Danger zone</h2>
        <ServerActionForm action={async () => {
          'use server'
          await setUserBlocked(user.id, user.status !== 'blocked')
        }}
        >
          <Button type="submit" variant="outline">{user.status === 'blocked' ? 'Unblock user' : 'Block and revoke sessions'}</Button>
        </ServerActionForm>
        <p className="text-sm text-muted-foreground">
          Deletion removes
          {impact.personalCorpora}
          {' '}
          personal corpus/corpora,
          {impact.soleOwnedTeams}
          {' '}
          sole-owned team(s), and
          {impact.teamCorpora}
          {' '}
          team corpus/corpora.
        </p>
        <ServerActionForm action={async () => {
          'use server'
          await deleteAdminManagedUser(user.id)
        }}
        >
          <Button type="submit" variant="destructive">Permanently delete user and dependent data</Button>
        </ServerActionForm>
      </section>
    </main>
  )
}
