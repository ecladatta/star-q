import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'
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

export default {
  providers: [GitHub({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  })],
  callbacks: {
    async signIn({ user }) {
      if (!isEmailAllowed(user.email)) {
        return false // Deny access for non-whitelisted emails
      }
      return true
    },
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
