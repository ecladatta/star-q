import { headers } from 'next/headers'
import { auth } from '@/auth'
import { isAuthEnabled } from '@/auth.config'

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not Found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export async function isApiKeyAuthenticated(): Promise<boolean> {
  const apiKey = process.env.API_KEY
  if (!apiKey) {
    return false
  }
  const headersList = await headers()
  return headersList.get('x-api-key') === apiKey
}

/**
 * Requires authentication when auth is enabled.
 * Returns the user ID if authenticated via session, null if auth is disabled or authenticated via API key.
 * Throws an error if auth is enabled but user is not authenticated.
 */
export async function requireAuth(): Promise<string | null> {
  if (!isAuthEnabled()) {
    return null
  }

  // AUTH_ENABLED=true: accept API key as alternative to a session
  if (await isApiKeyAuthenticated()) {
    return null
  }

  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    throw new UnauthorizedError()
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
