import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import WikimediaProvider from 'next-auth/providers/wikimedia'
import { NextResponse } from 'next/server'

function isLocalCredentialsEnabled(): boolean {
  return process.env.LOCAL_CREDENTIALS_ENABLED === 'true'
}

export const providers: NonNullable<NextAuthConfig['providers']> = [
  ...(isLocalCredentialsEnabled()
    ? [Credentials({
        credentials: {
          username: { label: 'Username', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          const { authorizeCredentials } = await import('@/lib/password-auth')
          return authorizeCredentials(credentials)
        },
      })]
    : []),
  ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
    ? [GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })]
    : []),
  ...(process.env.WIKIMEDIA_ID && process.env.WIKIMEDIA_SECRET
    ? [WikimediaProvider({ clientId: process.env.WIKIMEDIA_ID, clientSecret: process.env.WIKIMEDIA_SECRET })]
    : []),
]

export default {
  providers,
  pages: { signIn: '/sign-in' },
  callbacks: {
    authorized({ auth, request: { method, nextUrl } }) {
      const isAuthRoute = nextUrl.pathname.startsWith('/api/auth')
      const isPublicAccountRoute = nextUrl.pathname.startsWith('/sign-in')
        || nextUrl.pathname.startsWith('/sign-up')
        || nextUrl.pathname.startsWith('/setup')

      if (isAuthRoute || isPublicAccountRoute) {
        return true
      }
      if (method !== 'GET' && !auth?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return true
    },
  },
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig
