'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signIn, signOut } from '@/auth'
import { db } from '@/db/drizzle'
import { accounts, appSettings, auditLog, corpus, users } from '@/db/schema'
import { APP_SETTINGS_ID, getAppSettings, isLocalCredentialsEnabled } from '@/lib/app-settings'
import { ForbiddenError, getAuthenticatedUserForOnboarding } from '@/lib/auth-utils'
import { getRequiredString } from '@/lib/form-data'
import { validateDisplayName, validateOAuthProvider, validatePassword, validateUsername } from '@/lib/identity'
import { hashPassword, verifyPassword } from '@/lib/password-auth'
import { ensurePersonalTeam } from '@/lib/personal-team'

async function insertLocalUser(input: { username: string, name: string, password: string, mustChangePassword?: boolean }) {
  if (!isLocalCredentialsEnabled()) {
    throw new ForbiddenError('Local accounts are disabled for this deployment.')
  }

  const username = validateUsername(input.username)
  const name = validateDisplayName(input.name)
  const passwordHash = await hashPassword(input.password)
  const [user] = await db.insert(users).values({
    username,
    name,
    passwordHash,
    mustChangePassword: input.mustChangePassword ?? false,
  }).returning()
  return user
}

export async function signUpLocal(formData: FormData): Promise<void> {
  const settings = await getAppSettings()
  if (!settings.setupCompletedAt || !settings.signupEnabled || !settings.signinEnabled) {
    throw new ForbiddenError('Signup is disabled.')
  }

  const username = getRequiredString(formData, 'username')
  const name = getRequiredString(formData, 'name')
  const password = validatePassword(getRequiredString(formData, 'password'))
  if (password !== getRequiredString(formData, 'passwordConfirmation')) {
    throw new Error('Passwords do not match.')
  }

  const user = await insertLocalUser({ username, name, password })
  await ensurePersonalTeam(db, user.id)
  await db.insert(auditLog).values({
    actorUserId: user.id,
    action: 'auth.sign_up',
    targetType: 'user',
    targetId: user.id,
    metadata: { provider: 'credentials' },
  })
  await signIn('credentials', { username: user.username!, password, redirectTo: '/' })
}

export async function setupLocalAdministrator(formData: FormData): Promise<void> {
  if (!isLocalCredentialsEnabled()) {
    throw new ForbiddenError('Local accounts are disabled for this deployment.')
  }

  const username = validateUsername(getRequiredString(formData, 'username'))
  const name = validateDisplayName(getRequiredString(formData, 'name'))
  const password = validatePassword(getRequiredString(formData, 'password'))
  if (password !== getRequiredString(formData, 'passwordConfirmation')) {
    throw new Error('Passwords do not match.')
  }
  const passwordHash = await hashPassword(password)

  await db.transaction(async (trx) => {
    await trx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('star-q-initial-setup'))`)
    const [settings] = await trx.select().from(appSettings).where(eq(appSettings.id, APP_SETTINGS_ID)).limit(1)
    if (!settings || settings.setupCompletedAt) {
      throw new ForbiddenError('Initial setup has already been completed.')
    }

    const [user] = await trx.insert(users).values({
      username,
      name,
      passwordHash,
      role: 'admin',
    }).returning()
    await ensurePersonalTeam(trx, user.id)
    await trx.update(corpus).set({
      ownerType: 'user',
      ownerUserId: user.id,
      ownerTeamId: null,
    }).where(and(eq(corpus.ownerType, 'bootstrap'), isNull(corpus.ownerUserId), isNull(corpus.ownerTeamId)))
    await trx.update(appSettings).set({
      setupCompletedAt: new Date(),
      signupEnabled: true,
      signinEnabled: true,
      updatedAt: new Date(),
    }).where(eq(appSettings.id, APP_SETTINGS_ID))
    await trx.insert(auditLog).values({
      actorUserId: user.id,
      action: 'instance.setup_completed',
      targetType: 'instance',
      targetId: APP_SETTINGS_ID,
      metadata: { provider: 'credentials' },
    })
  })

  await signIn('credentials', { username, password, redirectTo: '/' })
}

export async function completeSetupWithOAuth(formData: FormData): Promise<void> {
  const currentUser = await getAuthenticatedUserForOnboarding()
  const username = validateUsername(getRequiredString(formData, 'username'))
  const name = validateDisplayName(getRequiredString(formData, 'name'))

  await db.transaction(async (trx) => {
    await trx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('star-q-initial-setup'))`)
    const [settings] = await trx.select().from(appSettings).where(eq(appSettings.id, APP_SETTINGS_ID)).limit(1)
    if (!settings || settings.setupCompletedAt) {
      throw new ForbiddenError('Initial setup has already been completed.')
    }

    await trx.update(users).set({ username, name, role: 'admin', updatedAt: new Date() }).where(eq(users.id, currentUser.id))
    await trx.update(corpus).set({ ownerType: 'user', ownerUserId: currentUser.id, ownerTeamId: null }).where(eq(corpus.ownerType, 'bootstrap'))
    await trx.update(appSettings).set({
      setupCompletedAt: new Date(),
      signupEnabled: true,
      signinEnabled: true,
      updatedAt: new Date(),
    }).where(eq(appSettings.id, APP_SETTINGS_ID))
    await trx.insert(auditLog).values({
      actorUserId: currentUser.id,
      action: 'instance.setup_completed',
      targetType: 'instance',
      targetId: APP_SETTINGS_ID,
      metadata: { provider: 'oauth' },
    })
  })

  await signOut({ redirectTo: '/sign-in?setup=complete' })
}

export async function completeOnboarding(formData: FormData): Promise<void> {
  const currentUser = await getAuthenticatedUserForOnboarding()
  const settings = await getAppSettings()
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }
  if (currentUser.username) {
    redirect('/')
  }

  const username = validateUsername(getRequiredString(formData, 'username'))
  const name = validateDisplayName(getRequiredString(formData, 'name'))
  await db.transaction(async (trx) => {
    await trx.update(users).set({ username, name, updatedAt: new Date() }).where(eq(users.id, currentUser.id))
    await ensurePersonalTeam(trx, currentUser.id)
    await trx.insert(auditLog).values({
      actorUserId: currentUser.id,
      action: 'auth.onboarding_completed',
      targetType: 'user',
      targetId: currentUser.id,
    })
  })
  redirect('/')
}

export async function updateOwnProfile(formData: FormData): Promise<void> {
  const currentUser = await getAuthenticatedUserForOnboarding()
  const username = validateUsername(getRequiredString(formData, 'username'))
  const name = validateDisplayName(getRequiredString(formData, 'name'))
  await db.transaction(async (trx) => {
    await trx.update(users).set({ username, name, updatedAt: new Date() }).where(eq(users.id, currentUser.id))
    await trx.insert(auditLog).values({
      actorUserId: currentUser.id,
      action: 'user.profile_updated',
      targetType: 'user',
      targetId: currentUser.id,
    })
  })
  revalidatePath('/account')
}

export async function changeOwnPassword(formData: FormData): Promise<void> {
  if (!isLocalCredentialsEnabled()) {
    throw new ForbiddenError('Local accounts are disabled for this deployment.')
  }
  const currentUser = await getAuthenticatedUserForOnboarding()
  const newPassword = validatePassword(getRequiredString(formData, 'newPassword'))
  if (newPassword !== getRequiredString(formData, 'passwordConfirmation')) {
    throw new Error('Passwords do not match.')
  }
  if (currentUser.passwordHash) {
    const currentPassword = getRequiredString(formData, 'currentPassword')
    if (!await verifyPassword(currentPassword, currentUser.passwordHash)) {
      throw new ForbiddenError('Current password is incorrect.')
    }
  }
  const passwordHash = await hashPassword(newPassword)
  await db.transaction(async (trx) => {
    await trx.update(users).set({
      passwordHash,
      mustChangePassword: false,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    }).where(eq(users.id, currentUser.id))
    await trx.insert(auditLog).values({
      actorUserId: currentUser.id,
      action: 'auth.password_changed',
      targetType: 'user',
      targetId: currentUser.id,
    })
  })
  await signOut({ redirectTo: '/sign-in?password=changed' })
}

export async function linkOAuthProvider(provider: 'github' | 'wikimedia'): Promise<void> {
  await getAuthenticatedUserForOnboarding()
  provider = validateOAuthProvider(provider)
  await signIn(provider, { redirectTo: '/account' })
}

export async function unlinkOAuthProvider(provider: 'github' | 'wikimedia'): Promise<void> {
  const currentUser = await getAuthenticatedUserForOnboarding()
  provider = validateOAuthProvider(provider)
  await db.transaction(async (trx) => {
    await trx.execute(sql`SELECT 1 FROM ${users} WHERE ${users.id} = ${currentUser.id} FOR UPDATE`)
    const [lockedUser] = await trx.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, currentUser.id)).limit(1)
    if (!lockedUser) {
      throw new ForbiddenError('User account no longer exists.')
    }
    const linkedAccounts = await trx.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, currentUser.id))
    const loginMethodCount = linkedAccounts.length + (lockedUser.passwordHash ? 1 : 0)
    if (loginMethodCount <= 1) {
      throw new ForbiddenError('You cannot remove your final sign-in method.')
    }
    const deleted = await trx.delete(accounts).where(and(eq(accounts.userId, currentUser.id), eq(accounts.provider, provider))).returning()
    if (!deleted.length) {
      throw new Error('Provider is not linked to this account.')
    }
    await trx.insert(auditLog).values({ actorUserId: currentUser.id, action: 'auth.provider_unlinked', targetType: 'user', targetId: currentUser.id, metadata: { provider } })
  })
  revalidatePath('/account')
}

export async function signOutCurrentUser() {
  await signOut({ redirectTo: '/' })
}
