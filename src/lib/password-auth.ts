import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { users } from '@/db/schema'
import { getAppSettings, isLocalCredentialsEnabled } from '@/lib/app-settings'
import { normalizeUsername } from '@/lib/identity'
import { verifyPassword } from '@/lib/password-hash'

export { hashPassword, verifyPassword } from '@/lib/password-hash'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

export async function authorizeCredentials(credentials: Partial<Record<'username' | 'password', unknown>>) {
  if (!isLocalCredentialsEnabled()) {
    return null
  }

  const username = typeof credentials.username === 'string' ? normalizeUsername(credentials.username) : ''
  const password = typeof credentials.password === 'string' ? credentials.password : ''
  if (!username || username.length > 32 || !password || password.length > 128) {
    return null
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
  if (!user?.passwordHash || user.status !== 'active') {
    return null
  }

  const now = new Date()
  if (user.lockedUntil && user.lockedUntil > now) {
    return null
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    await db.update(users).set({
      failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
      lockedUntil: sql`CASE
        WHEN ${users.failedLoginAttempts} + 1 >= ${MAX_FAILED_ATTEMPTS}
        THEN now() + (${LOCK_DURATION_MS} * interval '1 millisecond')
        ELSE ${users.lockedUntil}
      END`,
      updatedAt: now,
    }).where(eq(users.id, user.id))
    return null
  }

  const settings = await getAppSettings()
  if (settings.setupCompletedAt && !settings.signinEnabled && user.role !== 'admin') {
    return null
  }

  await db.update(users).set({
    failedLoginAttempts: 0,
    lockedUntil: null,
    updatedAt: sql`now()`,
  }).where(eq(users.id, user.id))

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  }
}
