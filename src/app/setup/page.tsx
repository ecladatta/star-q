import { redirect } from 'next/navigation'
import { completeSetupWithOAuth, setupLocalAdministrator } from '@/actions/account/accountActions'
import { auth } from '@/auth'
import { providers } from '@/auth.config'
import { OAuthProviderButtons } from '@/components/oauth-provider-buttons'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { getAppSettings, isLocalCredentialsEnabled } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const settings = await getAppSettings()
  if (settings.setupCompletedAt) {
    redirect('/')
  }
  const session = await auth()
  const localEnabled = isLocalCredentialsEnabled()
  const oauth = providers
    .map(provider => provider as { id?: string, name?: string })
    .filter((provider): provider is { id: string, name: string } => Boolean(provider.id && provider.name && provider.id !== 'credentials'))

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Set up STAR-Q</h1>
        <p className="text-sm text-muted-foreground">The first completed account becomes the global administrator and owns existing corpora.</p>
      </div>

      {session?.user?.valid
        ? (
            <ServerActionForm action={completeSetupWithOAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" name="name" defaultValue={session.user.name ?? ''} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Admin username</Label>
                <Input id="username" name="username" defaultValue={session.user.username ?? ''} required minLength={3} maxLength={32} />
              </div>
              <Button type="submit" className="w-full">Complete setup</Button>
            </ServerActionForm>
          )
        : (
            <>
              {localEnabled && (
                <ServerActionForm action={setupLocalAdministrator} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" name="name" required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Admin username</Label>
                    <Input id="username" name="username" required minLength={3} maxLength={32} autoComplete="username" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" required minLength={4} maxLength={128} autoComplete="new-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirmation">Confirm password</Label>
                    <Input id="passwordConfirmation" name="passwordConfirmation" type="password" required minLength={4} maxLength={128} autoComplete="new-password" />
                  </div>
                  <Button type="submit" className="w-full">Create administrator</Button>
                </ServerActionForm>
              )}
              {localEnabled && oauth.length > 0 && <Separator />}
              <div className="flex flex-col gap-3"><OAuthProviderButtons providers={oauth} action="Continue" redirectTo="/setup" /></div>
              {!localEnabled && oauth.length === 0 && (
                <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  No authentication method is configured. Enable local credentials or configure GitHub/Wikimedia OAuth before setup.
                </p>
              )}
            </>
          )}
    </main>
  )
}
