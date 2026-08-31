import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { providers } from '@/auth.config'
import { CredentialsSignInForm } from '@/components/credentials-sign-in-form'
import { OAuthProviderButtons } from '@/components/oauth-provider-buttons'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getAppSettings, isLocalCredentialsEnabled } from '@/lib/app-settings'
import { SIGNIN_LAST_USED_COOKIE } from '@/lib/constants'
import { authErrorMessage } from '@/lib/identity'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Sign in' }

function oauthProviders() {
  return providers
    .map(provider => provider as { id?: string, name?: string })
    .filter((provider): provider is { id: string, name: string } => Boolean(provider.id && provider.name && provider.id !== 'credentials'))
}

type SignInSearchParams = { error?: string | string[] }

export default async function SignInPage({ searchParams }: { searchParams: Promise<SignInSearchParams> }) {
  const { error } = await searchParams
  const errorMessage = authErrorMessage(error)
  const settings = await getAppSettings()
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }

  const session = await auth()
  const authenticated = session?.user?.valid === true
  if (authenticated && !errorMessage) {
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
  const cookieStore = await cookies()
  const lastUsed = cookieStore.get(SIGNIN_LAST_USED_COOKIE)?.value
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="space-y-6 rounded-xl border border-border bg-card p-6 sm:p-8">
        {errorMessage && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p>
        )}
        {authenticated && errorMessage
          ? (
              <div className="space-y-4">
                <Button asChild variant="outline" className="h-9 w-full"><Link href="/account">Back to your account</Link></Button>
              </div>
            )
          : (
              <>
                <div className="space-y-2 text-center">
                  <h1 className="text-lg font-semibold tracking-[-0.01em]">Sign in</h1>
                  {!settings.signinEnabled && <p className="text-sm text-warning-foreground">Sign-in is paused for users. Administrators can still sign in.</p>}
                </div>
                {localEnabled && <CredentialsSignInForm lastUsed={lastUsed === 'credentials'} />}
                {localEnabled && oauth.length > 0 && <Separator />}
                {oauth.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <OAuthProviderButtons providers={oauth} action="Sign in" lastUsedId={lastUsed} />
                  </div>
                )}
                {!localEnabled && oauth.length === 0 && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    No sign-in method is configured. Ask a deployment administrator to enable local credentials or an OAuth provider.
                  </p>
                )}
                {settings.signupEnabled && settings.signinEnabled && (
                  <p className="text-center text-sm text-muted-foreground">
                    Need an account?
                    {' '}
                    <Link href="/sign-up" className="text-accent hover:underline">Sign up</Link>
                  </p>
                )}
              </>
            )}
      </div>
    </main>
  )
}
