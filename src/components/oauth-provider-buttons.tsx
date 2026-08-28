import { SignInButton } from '@/components/sign-in-button'
import { Badge } from '@/components/ui/badge'

function ProviderIcon({ id }: { id: string }) {
  if (id === 'github') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
      </svg>
    )
  }
  if (id === 'wikimedia') {
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
  }
  return null
}

export type OAuthProviderDescriptor = { id: string, name: string }

export function OAuthProviderButtons({ providers, action, redirectTo, lastUsedId }: {
  providers: OAuthProviderDescriptor[]
  action: 'Sign in' | 'Sign up' | 'Continue'
  redirectTo?: string
  lastUsedId?: string
}) {
  return providers.map(provider => (
    <div key={provider.id} className="relative">
      <SignInButton id={provider.id} redirectTo={redirectTo}>
        <ProviderIcon id={provider.id} />
        {action}
        {' with '}
        {provider.name}
      </SignInButton>
      {lastUsedId === provider.id && (
        <Badge variant="secondary" className="pointer-events-none absolute -top-2 -right-2">
          Last used
        </Badge>
      )}
    </div>
  ))
}
