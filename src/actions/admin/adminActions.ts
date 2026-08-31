'use server'

import type { UserRole } from '@/db/schema'
import { and, count, desc, eq, getTableColumns, inArray, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db/drizzle'
import { appSettings, auditLog, corpus, team, teamMembership, users } from '@/db/schema'
import { APP_SETTINGS_ID, getAppSettings, isLocalCredentialsEnabled } from '@/lib/app-settings'
import { ForbiddenError, NotFoundError, requireAdmin } from '@/lib/auth-utils'
import { validateDisplayName, validatePassword, validateUsername, validateUserRole } from '@/lib/identity'
import { hashPassword } from '@/lib/password-auth'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function countOtherActiveAdmins(trx: DbTransaction, userId: string): Promise<number> {
  const [row] = await trx.select({ count: count() }).from(users).where(and(
    eq(users.role, 'admin'),
    eq(users.status, 'active'),
    ne(users.id, userId),
  ))
  return row?.count ?? 0
}

async function lockAdminInvariant(trx: DbTransaction) {
  await trx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('star-q-active-admin-invariant'))`)
}

async function assertNotFinalActiveAdmin(trx: DbTransaction, userId: string) {
  const [target] = await trx.select({ role: users.role, status: users.status }).from(users).where(eq(users.id, userId)).limit(1)
  if (target?.role === 'admin' && target.status === 'active' && await countOtherActiveAdmins(trx, userId) === 0) {
    throw new ForbiddenError('The final active administrator cannot be blocked, demoted, or deleted.')
  }
}

export async function getAdminSettings() {
  await requireAdmin()
  return getAppSettings()
}

export async function updateAdminSettings(input: { signupEnabled?: boolean, signinEnabled?: boolean }) {
  const actor = await requireAdmin()
  const patch: { signupEnabled?: boolean, signinEnabled?: boolean, updatedAt: Date } = { updatedAt: new Date() }
  if (typeof input.signupEnabled === 'boolean') {
    patch.signupEnabled = input.signupEnabled
  }
  if (typeof input.signinEnabled === 'boolean') {
    patch.signinEnabled = input.signinEnabled
  }
  await db.transaction(async (trx) => {
    await trx.update(appSettings).set(patch).where(eq(appSettings.id, APP_SETTINGS_ID))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'instance.settings_updated', targetType: 'instance', targetId: APP_SETTINGS_ID, metadata: input })
  })
  revalidatePath('/admin/settings')
}

export async function getAdminUsers() {
  await requireAdmin()
  return db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    role: users.role,
    status: users.status,
    hasPassword: sql<boolean>`${users.passwordHash} IS NOT NULL`,
    mustChangePassword: users.mustChangePassword,
    lastSignedInAt: users.lastSignedInAt,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt))
}

export async function getAdminUser(userId: string) {
  await requireAdmin()
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw new NotFoundError('User not found.')
  }
  return user
}

export async function createAdminManagedUser(input: { username: string, name: string, temporaryPassword: string, role: UserRole }) {
  const actor = await requireAdmin()
  if (!isLocalCredentialsEnabled()) {
    throw new ForbiddenError('Local accounts are disabled for this deployment.')
  }
  const username = validateUsername(input.username)
  const name = validateDisplayName(input.name)
  const role = validateUserRole(input.role)
  const passwordHash = await hashPassword(validatePassword(input.temporaryPassword))
  const [createdUser] = await db.insert(users).values({
    username,
    name,
    passwordHash,
    mustChangePassword: true,
    role,
  }).returning()
  await db.insert(auditLog).values({ actorUserId: actor.userId, action: 'admin.user_created', targetType: 'user', targetId: createdUser.id, metadata: { role } })
  revalidatePath('/admin/users')
  return createdUser
}

export async function updateAdminManagedUser(userId: string, input: { username: string, name: string, role: UserRole }) {
  const actor = await requireAdmin()
  const username = validateUsername(input.username)
  const name = validateDisplayName(input.name)
  const role = validateUserRole(input.role)
  await db.transaction(async (trx) => {
    await lockAdminInvariant(trx)
    const [existing] = await trx.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
    if (!existing) {
      throw new NotFoundError('User not found.')
    }
    if (existing.role === 'admin' && role !== 'admin') {
      await assertNotFinalActiveAdmin(trx, userId)
    }
    await trx.update(users).set({ username, name, role, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, userId))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'admin.user_updated', targetType: 'user', targetId: userId, metadata: { role } })
  })
  revalidatePath('/admin/users')
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  const actor = await requireAdmin()
  if (actor.userId === userId && blocked) {
    throw new ForbiddenError('Administrators cannot block their own current account.')
  }
  const changed = await db.transaction(async (trx) => {
    await lockAdminInvariant(trx)
    if (blocked) {
      await assertNotFinalActiveAdmin(trx, userId)
    }
    const updated = await trx.update(users).set({
      status: blocked ? 'blocked' : 'active',
      blockedAt: blocked ? new Date() : null,
      blockedByUserId: blocked ? actor.userId : null,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning({ id: users.id })
    if (!updated.length) {
      throw new NotFoundError('User not found.')
    }
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: blocked ? 'admin.user_blocked' : 'admin.user_unblocked', targetType: 'user', targetId: userId })
    return updated
  })
  revalidatePath('/admin/users')
  return changed
}

export async function resetUserPassword(userId: string, temporaryPassword: string) {
  const actor = await requireAdmin()
  if (!isLocalCredentialsEnabled()) {
    throw new ForbiddenError('Local accounts are disabled for this deployment.')
  }
  const passwordHash = await hashPassword(validatePassword(temporaryPassword))
  const changed = await db.transaction(async (trx) => {
    const updated = await trx.update(users).set({
      passwordHash,
      mustChangePassword: true,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning({ id: users.id })
    if (!updated.length) {
      throw new NotFoundError('User not found.')
    }
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'admin.password_reset', targetType: 'user', targetId: userId })
    return updated
  })
  revalidatePath('/admin/users')
  return changed
}

export async function getUserDeletionImpact(userId: string) {
  await requireAdmin()
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
  if (!target) {
    throw new NotFoundError('User not found.')
  }
  const [personal] = await db.select({ count: count() }).from(corpus).where(eq(corpus.ownerUserId, userId))
  const ownerTeams = await db.select({ teamId: teamMembership.teamId }).from(teamMembership).where(and(eq(teamMembership.userId, userId), eq(teamMembership.role, 'owner')))
  const soleOwnedTeamIds: string[] = []
  for (const ownerTeam of ownerTeams) {
    const [owners] = await db.select({ count: count() }).from(teamMembership).where(and(eq(teamMembership.teamId, ownerTeam.teamId), eq(teamMembership.role, 'owner')))
    if ((owners?.count ?? 0) === 1) {
      soleOwnedTeamIds.push(ownerTeam.teamId)
    }
  }
  const [teamCorpora] = soleOwnedTeamIds.length
    ? await db.select({ count: count() }).from(corpus).where(inArray(corpus.ownerTeamId, soleOwnedTeamIds))
    : [{ count: 0 }]
  return { personalCorpora: personal?.count ?? 0, soleOwnedTeams: soleOwnedTeamIds.length, teamCorpora: teamCorpora?.count ?? 0 }
}

export async function deleteAdminManagedUser(userId: string) {
  const actor = await requireAdmin()
  if (actor.userId === userId) {
    throw new ForbiddenError('Administrators cannot delete their own current account.')
  }
  const impact = await getUserDeletionImpact(userId)

  await db.transaction(async (trx) => {
    await lockAdminInvariant(trx)
    await trx.execute(sql`SELECT 1 FROM ${users} WHERE ${users.id} = ${userId} FOR UPDATE`)
    await assertNotFinalActiveAdmin(trx, userId)
    const ownerTeams = await trx.select({ teamId: teamMembership.teamId }).from(teamMembership).where(and(eq(teamMembership.userId, userId), eq(teamMembership.role, 'owner')))
    ownerTeams.sort((left, right) => left.teamId.localeCompare(right.teamId))
    for (const ownerTeam of ownerTeams) {
      await trx.execute(sql`SELECT 1 FROM ${team} WHERE ${team.id} = ${ownerTeam.teamId} FOR UPDATE`)
      const [owners] = await trx.select({ count: count() }).from(teamMembership).where(and(eq(teamMembership.teamId, ownerTeam.teamId), eq(teamMembership.role, 'owner')))
      if ((owners?.count ?? 0) === 1) {
        await trx.delete(team).where(eq(team.id, ownerTeam.teamId))
      }
    }
    const deleted = await trx.delete(users).where(eq(users.id, userId)).returning({ id: users.id })
    if (!deleted.length) {
      throw new NotFoundError('User not found.')
    }
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'admin.user_deleted', targetType: 'user', targetId: userId, metadata: impact })
  })
  revalidatePath('/admin/users')
  revalidatePath('/teams')
  revalidatePath('/')
  redirect('/admin/users')
}

export async function getAdminAuditLog() {
  await requireAdmin()
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(500)
}

export async function getAdminTeams() {
  await requireAdmin()
  return db.select().from(team).orderBy(desc(team.createdAt))
}

export async function getAdminCorpora() {
  await requireAdmin()
  return db
    .select({
      ...getTableColumns(corpus),
      ownerName: sql<string | null>`COALESCE(${users.name}, ${team.name})`,
      ownerIdentifier: sql<string | null>`COALESCE(${users.username}, ${team.slug})`,
    })
    .from(corpus)
    .leftJoin(users, eq(users.id, corpus.ownerUserId))
    .leftJoin(team, eq(team.id, corpus.ownerTeamId))
    .orderBy(desc(corpus.createdAt))
}
