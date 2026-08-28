import type { Adapter, AdapterUser } from 'next-auth/adapters'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { and, eq } from 'drizzle-orm'
import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { db } from './db/drizzle'
import { accounts, appSettings, auditLog, users } from './db/schema'

const adapter = DrizzleAdapter(db) as Adapter
const createUser = adapter.createUser

if (!createUser) {
  throw new Error('The authentication adapter must implement createUser.')
}

const guardedAdapter: Adapter = {
  ...adapter,
  async createUser(user: AdapterUser) {
    const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 'default')).limit(1)
    if (!settings) {
      throw new Error('Application settings are missing. Run database migrations.')
    }
    if (settings.setupCompletedAt && (!settings.signupEnabled || !settings.signinEnabled)) {
      throw new Error('Signup is disabled.')
    }
    return createUser(user)
  },
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: guardedAdapter,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account }) {
      if (!account || account.type === 'credentials') {
        return true
      }

      const [linkedUser] = await db
        .select({ id: users.id, role: users.role, status: users.status })
        .from(accounts)
        .innerJoin(users, eq(users.id, accounts.userId))
        .where(and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, account.providerAccountId),
        ))
        .limit(1)

      if (!linkedUser) {
        return true
      }
      if (linkedUser.status !== 'active') {
        return false
      }

      const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 'default')).limit(1)
      if (!settings) {
        throw new Error('Application settings are missing. Run database migrations.')
      }
      return !settings.setupCompletedAt || settings.signinEnabled || linkedUser.role === 'admin'
    },
    async session({ token, session }) {
      session.user.id = token.id as string
      session.user.name = token.name
      session.user.image = token.picture
      session.user.username = token.username as string | null
      session.user.role = token.role as 'user' | 'admin'
      session.user.status = token.status as 'active' | 'blocked'
      session.user.sessionVersion = token.sessionVersion as number
      session.user.mustChangePassword = Boolean(token.mustChangePassword)
      session.user.valid = token.valid !== false
      session.user.lastSignInProvider = (token.lastSignInProvider as string | null) ?? null
      return session
    },
    async jwt({ token, user, account }) {
      const userId = (user?.id ?? token.id ?? token.sub) as string | undefined
      if (!userId) {
        token.valid = false
        return token
      }

      const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
      if (!dbUser || dbUser.status !== 'active') {
        token.valid = false
        return token
      }

      const isNewSession = Boolean(user)
      if (!isNewSession && token.sessionVersion !== dbUser.sessionVersion) {
        token.valid = false
        return token
      }

      return {
        ...token,
        id: dbUser.id,
        sub: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
        username: dbUser.username,
        role: dbUser.role,
        status: dbUser.status,
        sessionVersion: dbUser.sessionVersion,
        mustChangePassword: dbUser.mustChangePassword,
        valid: true,
        lastSignInProvider: isNewSession ? (account?.provider ?? 'unknown') : token.lastSignInProvider,
      }
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) {
        throw new Error('Authenticated user is missing an ID.')
      }
      const userId = user.id
      await db.transaction(async (trx) => {
        await trx.update(users).set({ lastSignedInAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId))
        await trx.insert(auditLog).values({
          actorUserId: userId,
          action: 'auth.sign_in',
          targetType: 'user',
          targetId: userId,
          metadata: { provider: account?.provider ?? 'unknown' },
        })
      })
    },
    async linkAccount({ user, account }) {
      await db.insert(auditLog).values({
        actorUserId: user.id,
        action: 'auth.provider_linked',
        targetType: 'user',
        targetId: user.id,
        metadata: { provider: account.provider },
      })
    },
  },
})
