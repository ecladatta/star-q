import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { linkOAuthProvider, unlinkOAuthProvider, updateOwnProfile } from '@/actions/account/accountActions'
import { providers } from '@/auth.config'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db } from '@/db/drizzle'
import { accounts } from '@/db/schema'
import { getAppSettings, isLocalCredentialsEnabled } from '@/lib/app-settings'
import { getAuthenticatedUserForOnboarding, requirePageUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const settings = await getAppSettings()
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }
  await requirePageUser()
  const user = await getAuthenticatedUserForOnboarding()
  const linked = await db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, user.id))
  const linkedProviders = new Set(linked.map(account => account.provider))
  const configuredOAuth = providers
    .map(provider => provider as { id?: string, name?: string })
    .filter((provider): provider is { id: 'github' | 'wikimedia', name: string } => Boolean(provider.id && provider.name && (provider.id === 'github' || provider.id === 'wikimedia')))

  return (
    <Page>
      <PageHeader title="Account" description="Manage your public identity and sign-in methods." />
      <section className="space-y-8">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium">Profile</h2>
          <ServerActionForm action={updateOwnProfile} className="max-w-lg space-y-4" successMessage="Profile saved">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" name="name" defaultValue={user.name ?? ''} required />
              <p className="text-xs text-muted-foreground">How your name appears across the app.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" defaultValue={user.username ?? ''} required />
              <p className="text-xs text-muted-foreground">Public handle used for mentions and invitations.</p>
            </div>
            <Button type="submit">Save profile</Button>
          </ServerActionForm>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Sign-in methods</h2>
            {isLocalCredentialsEnabled() && <Button variant="outline" asChild><Link href="/account/password">{user.passwordHash ? 'Change password' : 'Add password'}</Link></Button>}
          </div>
          <div className="space-y-3">
            {configuredOAuth.map(provider => (
              <div key={provider.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-[13px] font-medium">{provider.name}</span>
                {linkedProviders.has(provider.id)
                  ? (
                      <ServerActionForm action={async () => {
                        'use server'
                        await unlinkOAuthProvider(provider.id)
                      }}
                      >
                        <Button type="submit" variant="outline">Unlink</Button>
                      </ServerActionForm>
                    )
                  : (
                      <ServerActionForm action={async () => {
                        'use server'
                        await linkOAuthProvider(provider.id)
                      }}
                      >
                        <Button type="submit" variant="outline">Link</Button>
                      </ServerActionForm>
                    )}
              </div>
            ))}
            {!user.passwordHash && configuredOAuth.length === 0 && <p className="text-sm text-muted-foreground">No additional sign-in methods are configured.</p>}
          </div>
        </section>
      </section>
    </Page>
  )
}
