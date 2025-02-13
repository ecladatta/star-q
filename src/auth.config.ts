import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { NextResponse } from 'next/server'

export default {
  providers: [GitHub({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  })],
  callbacks: {
    authorized({ auth, request: { method, nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAuthApi = nextUrl.pathname.startsWith('/api/auth')

      if (isOnAuthApi) {
        return true // Always allow access to the auth API
      }

      if (method === 'POST' && !isLoggedIn) {
        return NextResponse.json('Invalid auth token', { status: 401 })
      }

      return isLoggedIn
    },
  },
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig
