import { auth } from '@/auth'
import { isAuthEnabled } from '@/auth.config'

/**
 * Requires authentication when auth is enabled.
 * Returns the user ID if authenticated, null if auth is disabled.
 * Throws an error if auth is enabled but user is not authenticated.
 */
export async function requireAuth(): Promise<string | null> {
  if (!isAuthEnabled()) {
    return null
  }

  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    throw new Error('User not authenticated')
  }

  return userId
}

/**
 * Gets the optional user ID.
 * Returns the user ID if authenticated, null otherwise.
 * Does not throw if not authenticated.
 */
export async function getOptionalUserId(): Promise<string | null> {
  if (!isAuthEnabled()) {
    return null
  }

  const session = await auth()
  return session?.user?.id || null
}
