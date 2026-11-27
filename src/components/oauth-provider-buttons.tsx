import { GithubMark } from '@/components/github-mark'
import { SignInButton } from '@/components/sign-in-button'
import { Badge } from '@/components/ui/badge'

function ProviderIcon({ id }: { id: string }) {
  if (id === 'github') {
    return <GithubMark />
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
