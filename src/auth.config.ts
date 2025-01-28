import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'

export default {
  providers: [GitHub({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  })],
  callbacks: {
    authorized: async ({ auth }) => {
      console.log('checking if user is authorized', auth, !!auth)
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth
    },
  },
  session: { strategy: 'jwt' },
} satisfies NextAuthConfig
