import type { UserRole } from '@/db/schema'
import Link from 'next/link'
import { createAdminManagedUser, getAdminUsers } from '@/actions/admin/adminActions'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isLocalCredentialsEnabled } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const users = await getAdminUsers()
  return (
    <main className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          {users.length}
          {' '}
          registered accounts
        </p>
      </div>
      {isLocalCredentialsEnabled() && (
        <section className="rounded-md border p-5">
          <h2 className="mb-4 text-lg font-semibold">Create local user</h2>
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
            <select name="role" className="h-8 rounded-md border bg-background px-3 text-sm">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit">Create</Button>
          </ServerActionForm>
        </section>
      )}
      <section className="overflow-hidden rounded-md border">
        {users.map(user => (
          <Link key={user.id} href={`/admin/users/${user.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b p-4 last:border-0 hover:bg-muted/50">
            <div>
              <p className="font-medium">{user.name ?? 'Unnamed user'}</p>
              <p className="text-sm text-muted-foreground">
                @
                {user.username ?? 'onboarding required'}
              </p>
            </div>
            <span className="text-sm capitalize">{user.role}</span>
            <span className="text-sm capitalize">{user.status}</span>
          </Link>
        ))}
      </section>
    </main>
  )
}
