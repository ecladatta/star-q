import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import WikimediaProvider from 'next-auth/providers/wikimedia'
import { NextResponse } from 'next/server'

function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email)
    return false

  const allowedEmails = process.env.ALLOWED_EMAILS
  if (!allowedEmails)
    return true // If no whitelist is configured, allow all

  const emailList = allowedEmails.split(',').map(e => e.trim().toLowerCase())
  return emailList.includes(email.toLowerCase())
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
    async signIn({ user }) {
      if (!isEmailAllowed(user.email)) {
        return false // Deny access for non-whitelisted emails
      }
      return true
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
