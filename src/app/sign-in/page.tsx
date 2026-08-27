import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { providers } from '@/auth.config'
import { CredentialsSignInForm } from '@/components/credentials-sign-in-form'
import { OAuthProviderButtons } from '@/components/oauth-provider-buttons'
import { Separator } from '@/components/ui/separator'
import { getAppSettings, isLocalCredentialsEnabled } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Sign in' }

function oauthProviders() {
  return providers
    .map(provider => provider as { id?: string, name?: string })
    .filter((provider): provider is { id: string, name: string } => Boolean(provider.id && provider.name && provider.id !== 'credentials'))
}

export default async function SignInPage() {
  const settings = await getAppSettings()
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }

  const session = await auth()
  if (session?.user?.valid) {
    if (!session.user.username) {
      redirect('/onboarding')
    }
    if (session.user.mustChangePassword) {
      redirect('/account/password')
    }
    redirect('/')
  }

  const oauth = oauthProviders()
  const localEnabled = isLocalCredentialsEnabled()
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        {!settings.signinEnabled && <p className="text-sm text-amber-700">Sign-in is paused for users. Administrators can still sign in.</p>}
      </div>
      {localEnabled && <CredentialsSignInForm />}
      {localEnabled && oauth.length > 0 && <Separator />}
      <div className="flex flex-col gap-3">
        <OAuthProviderButtons providers={oauth} action="Sign in" />
      </div>
      {!localEnabled && oauth.length === 0 && (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No sign-in method is configured. Ask a deployment administrator to enable local credentials or an OAuth provider.
        </p>
      )}
      {settings.signupEnabled && settings.signinEnabled && (
        <p className="text-center text-sm text-muted-foreground">
          Need an account?
          {' '}
          <Link href="/sign-up" className="underline">Sign up</Link>
        </p>
      )}
    </main>
  )
}
