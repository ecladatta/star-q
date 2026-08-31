import type { UserRole } from '@/db/schema'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/db/drizzle'
import { apiKey, users } from '@/db/schema'

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not Found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export type AuthenticatedActor = {
  type: 'user'
  userId: string
  role: UserRole
  username: string
}

export type AnonymousActor = { type: 'anonymous' }
export type AdminReadKeyActor = { type: 'admin-read-key' }
export type RequestActor = AuthenticatedActor | AnonymousActor | AdminReadKeyActor

const requestActorStorage = new AsyncLocalStorage<RequestActor>()

export async function isAdminReadKeyAuthenticated(): Promise<boolean> {
  const headersList = await headers()
  const requestKey = headersList.get('x-api-key')
  if (!requestKey) {
    return false
  }
  const keyHash = createHash('sha256').update(requestKey).digest('hex')
  const [matchedKey] = await db
    .select({ id: apiKey.id })
    .from(apiKey)
    .where(eq(apiKey.keyHash, keyHash))
    .limit(1)
  if (!matchedKey) {
    return false
  }
  await db.update(apiKey).set({ lastUsedAt: new Date(), updatedAt: new Date() }).where(eq(apiKey.id, matchedKey.id))
  return true
}

async function getSessionUser(requireUsername: boolean) {
  const session = await auth()
  if (!session?.user?.id || !session.user.valid) {
    return null
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
  if (!user || user.status !== 'active' || user.sessionVersion !== session.user.sessionVersion) {
    return null
  }
  if (requireUsername && !user.username) {
    throw new ForbiddenError('Complete account onboarding before continuing.')
  }
  if (requireUsername && user.mustChangePassword) {
    throw new ForbiddenError('Change your temporary password before continuing.')
  }
  return user
}

export async function getRequestActor(options: { requireUsername?: boolean } = {}): Promise<RequestActor> {
  const contextualActor = requestActorStorage.getStore()
  if (contextualActor) {
    return contextualActor
  }

  const user = await getSessionUser(options.requireUsername ?? true)
  if (!user) {
    return { type: 'anonymous' }
  }
  if (!user.username) {
    throw new ForbiddenError('Complete account onboarding before continuing.')
  }
  return { type: 'user', userId: user.id, role: user.role, username: user.username }
}

export async function getApiRequestActor(): Promise<RequestActor> {
  if (await isAdminReadKeyAuthenticated()) {
    return { type: 'admin-read-key' }
  }
  return getRequestActor()
}

export function runWithRequestActor<T>(actor: RequestActor, handler: () => Promise<T>): Promise<T> {
  return requestActorStorage.run(actor, handler)
}

export async function requireAuth(): Promise<string> {
  const actor = await getRequestActor()
  if (actor.type !== 'user') {
    throw new UnauthorizedError()
  }
  return actor.userId
}

export async function requirePageUser(): Promise<AuthenticatedActor> {
  const session = await auth()
  if (!session?.user?.valid) {
    redirect('/sign-in')
  }
  if (!session.user.username) {
    redirect('/onboarding')
  }
  if (session.user.mustChangePassword) {
    redirect('/account/password')
  }
  const actor = await getRequestActor()
  if (actor.type !== 'user') {
    redirect('/sign-in')
  }
  return actor
}

export async function requireAdmin(): Promise<AuthenticatedActor> {
  const actor = await getRequestActor()
  if (actor.type !== 'user') {
    throw new UnauthorizedError()
  }
  if (actor.role !== 'admin') {
    throw new ForbiddenError()
  }
  return actor
}

export async function getOptionalUserId(): Promise<string | null> {
  const actor = await getRequestActor()
  return actor.type === 'user' ? actor.userId : null
}

export async function getAuthenticatedUserForOnboarding() {
  const user = await getSessionUser(false)
  if (!user) {
    throw new UnauthorizedError()
  }
  return user
}
