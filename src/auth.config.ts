import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import WikimediaProvider from 'next-auth/providers/wikimedia'
import { NextResponse } from 'next/server'

function isAllowlisted(
  value: string | null | undefined,
  allowlist: string | undefined,
  normalize: (entry: string) => string = entry => entry,
): boolean {
  if (!value)
    return false

  if (!allowlist)
    return true // If no whitelist is configured, allow all

  const normalizedValue = normalize(value.trim())
  return allowlist
    .split(',')
    .some(entry => normalize(entry.trim()) === normalizedValue)
}

function isEmailAllowed(email: string | null | undefined): boolean {
  return isAllowlisted(
    email,
    process.env.ALLOWED_EMAILS,
    entry => entry.toLowerCase(),
  )
}

function isWikimediaIdAllowed(id: string | null | undefined): boolean {
  return isAllowlisted(id, process.env.ALLOWED_WIKIMEDIA_IDS)
}

export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === 'true'
}

const providers: NonNullable<NextAuthConfig['providers']> = isAuthEnabled()
  ? [
      ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
        ? [GitHub({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          })]
        : []),
      ...(process.env.WIKIMEDIA_ID && process.env.WIKIMEDIA_SECRET
        ? [WikimediaProvider({
            clientId: process.env.WIKIMEDIA_ID,
            clientSecret: process.env.WIKIMEDIA_SECRET,
          })]
        : []),
    ]
  : []

export default {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'wikimedia')
        return isWikimediaIdAllowed(account.providerAccountId)

      return isEmailAllowed(user.email)
    },
    authorized({ auth, request: { method, nextUrl, headers } }) {
      if (!isAuthEnabled()) {
        return true
      }

      const apiKey = process.env.API_KEY
      const requestApiKey = headers.get?.('x-api-key')
      const isOnApiRoute = nextUrl.pathname.startsWith('/api')

      // Allow API access via API key without requiring NextAuth login
      if (apiKey && isOnApiRoute && requestApiKey === apiKey) {
        return true
      }

      const isLoggedIn = !!auth?.user
      const isOnAuthApi = nextUrl.pathname.startsWith('/api/auth')

      if (isOnAuthApi) {
        return true // Always allow access to the auth API
      }

      if (method === 'POST' && !isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return isLoggedIn
    },
  },
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig
