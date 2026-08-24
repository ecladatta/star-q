import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isAuthEnabled, providers } from '@/auth.config'
import { SignInButton } from '@/components/sign-in-button'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in',
}

function ProviderIcon({ id }: { id: string }) {
  switch (id) {
    case 'github':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
        </svg>
      )
    case 'wikimedia':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 32 32" fill="currentColor" aria-hidden="true">
          <clipPath id="wikimedia-clip"><path d="M1-2v12h-2V-2l-15-15v33h32v-33z" /></clipPath>
          <g clipPath="url(#wikimedia-clip)">
            <circle r="9" />
            <circle r="13" fill="none" stroke="currentColor" strokeWidth="4" />
          </g>
          <circle cy="-10" r="5" />
        </svg>
      )
    default:
      return null
  }
}

function ProviderButton({ id, name }: { id: string, name: string }) {
  return (
    <SignInButton id={id}>
      <ProviderIcon id={id} />
      Sign in with
      {' '}
      {name}
    </SignInButton>
  )
}

export default async function SignInPage() {
  if (!isAuthEnabled()) {
    redirect('/')
  }

  const session = await auth()
  if (session) {
    redirect('/')
  }

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-500">
        Choose how you want to sign in to the annotation tool.
      </p>
      <div className="flex w-full flex-col gap-3">
        {providers.map(provider => (
          <ProviderButton
            key={(provider as { id: string }).id}
            id={(provider as { id: string, name: string }).id}
            name={(provider as { id: string, name: string }).name}
          />
        ))}
      </div>
    </main>
  )
}
