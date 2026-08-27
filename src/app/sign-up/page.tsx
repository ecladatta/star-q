import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signUpLocal } from '@/actions/account/accountActions'
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
export const metadata: Metadata = { title: 'Sign up' }

export default async function SignUpPage() {
  const settings = await getAppSettings()
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }
  if (!settings.signupEnabled || !settings.signinEnabled) {
    redirect('/sign-in')
  }
  if ((await auth())?.user?.valid) {
    redirect('/')
  }

  const oauth = providers
    .map(provider => provider as { id?: string, name?: string })
    .filter((provider): provider is { id: string, name: string } => Boolean(provider.id && provider.name && provider.id !== 'credentials'))
  const localEnabled = isLocalCredentialsEnabled()

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="text-sm text-muted-foreground">Your unique username is how other users invite you.</p>
      </div>
      {localEnabled && (
        <ServerActionForm action={signUpLocal} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" name="name" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
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
          <Button type="submit" className="w-full">Create account</Button>
        </ServerActionForm>
      )}
      {localEnabled && oauth.length > 0 && <Separator />}
      <div className="flex flex-col gap-3"><OAuthProviderButtons providers={oauth} action="Sign up" redirectTo="/onboarding" /></div>
      {!localEnabled && oauth.length === 0 && (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No signup method is configured. Ask a deployment administrator to enable local credentials or an OAuth provider.
        </p>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Already registered?
        {' '}
        <Link href="/sign-in" className="underline">Sign in</Link>
      </p>
    </main>
  )
}
