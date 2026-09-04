import type { UserRole } from '@/db/schema'
import Link from 'next/link'
import { createAdminManagedUser, getAdminUsers } from '@/actions/admin/adminActions'
import { AdminUserActions } from '@/components/admin-user-actions'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table } from '@/components/ui/table'
import { isLocalCredentialsEnabled } from '@/lib/app-settings'
import { requirePageUser } from '@/lib/auth-utils'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function RolePill({ role }: { role: string }) {
  return (
    <span className={cn('inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize', role === 'admin' ? 'text-foreground' : 'text-muted-foreground')}>
      {role}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize', status === 'blocked' ? 'text-destructive' : 'text-muted-foreground')}>
      {status}
    </span>
  )
}

export default async function AdminUsersPage() {
  const [users, actor] = await Promise.all([getAdminUsers(), requirePageUser()])
  return (
    <Page>
      <PageHeader
        title="Users"
        description={`${users.length} registered accounts`}
      />
      {isLocalCredentialsEnabled() && (
        <section className="mb-6 max-w-2xl rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Create local user</h2>
          <ServerActionForm
            action={async (formData) => {
              'use server'
              await createAdminManagedUser({ username: String(formData.get('username')), name: String(formData.get('name')), temporaryPassword: String(formData.get('temporaryPassword')), role: String(formData.get('role')) as UserRole })
            }}
            className="grid gap-3 md:grid-cols-5 md:items-end"
            successMessage="User created"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temporaryPassword">Temporary password</Label>
              <Input id="temporaryPassword" name="temporaryPassword" type="password" minLength={4} required />
            </div>
            <select name="role" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit">Create</Button>
          </ServerActionForm>
        </section>
      )}
      <section className="w-full overflow-hidden rounded-lg border border-border">
        <Table>
          <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">User</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="w-14 px-3 py-2 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t border-border transition-colors hover:bg-muted/30">
                <td className="px-3 py-2.5 text-[13px]">
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-foreground hover:text-accent hover:underline">
                    {user.name ?? 'Unnamed user'}
                  </Link>
                  <p className="mt-0.5 font-mono text-[13px] text-muted-foreground">
                    @
                    {user.username ?? 'onboarding required'}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-[13px]">
                  <RolePill role={user.role} />
                </td>
                <td className="px-3 py-2.5 text-[13px]">
                  <StatusPill status={user.status} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <div className="flex justify-end">
                    <AdminUserActions
                      user={user}
                      currentUserId={actor.userId}
                      canResetPassword={isLocalCredentialsEnabled()}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </Page>
  )
}
