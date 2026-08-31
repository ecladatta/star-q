import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import WikimediaProvider from 'next-auth/providers/wikimedia'
import { NextResponse } from 'next/server'
import { SIGNIN_LAST_USED_COOKIE, SIGNIN_LAST_USED_COOKIE_MAX_AGE } from '@/lib/constants'

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
    async session({ session, token }) {
      session.user.lastSignInProvider = (token.lastSignInProvider as string | null) ?? null
      return session
    },
    authorized({ auth, request }) {
      const method = request.method
      const nextUrl = request.nextUrl
      const isAuthRoute = nextUrl.pathname.startsWith('/api/auth')
      const isPublicAccountRoute = nextUrl.pathname.startsWith('/sign-in')
        || nextUrl.pathname.startsWith('/sign-up')
        || nextUrl.pathname.startsWith('/setup')

      // Device marker: intentionally not cleared on sign-out, so /sign-in can show the last-used method.
      const response = NextResponse.next()
      const lastUsed = auth?.user?.lastSignInProvider
      if (lastUsed && lastUsed !== request.cookies.get(SIGNIN_LAST_USED_COOKIE)?.value) {
        response.cookies.set(SIGNIN_LAST_USED_COOKIE, lastUsed, {
          path: '/',
          maxAge: SIGNIN_LAST_USED_COOKIE_MAX_AGE,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
        })
      }
      if (isAuthRoute || isPublicAccountRoute) {
        return response
      }
      if (method !== 'GET' && !auth?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return response
    },
  },
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig
