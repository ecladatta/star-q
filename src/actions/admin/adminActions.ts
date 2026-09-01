'use server'

import type { DbExecutor, DbTransaction } from '@/db/drizzle'
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
import { getSoleOwnedTeamIds } from '@/lib/team-access'

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
  const createdUser = await db.transaction(async (trx) => {
    const [created] = await trx.insert(users).values({
      username,
      name,
      passwordHash,
      mustChangePassword: true,
      role,
    }).returning()
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'admin.user_created', targetType: 'user', targetId: created.id, metadata: { role } })
    return created
  })
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
    await trx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update')
    if (blocked) {
      await assertNotFinalActiveAdmin(trx, userId)
      if ((await getSoleOwnedTeamIds(trx, userId)).length) {
        throw new ForbiddenError('Appoint another active team owner before blocking this user.')
      }
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

export type DeletionImpact = {
  personalCorpora: number
  soleOwnedTeams: number
  teamCorpora: number
}

async function calculateUserDeletionImpact(executor: DbExecutor, userId: string): Promise<{ impact: DeletionImpact, soleOwnedTeamIds: string[] }> {
  const [personal] = await executor.select({ count: count() }).from(corpus).where(eq(corpus.ownerUserId, userId))
  const soleOwnedTeamIds = await getSoleOwnedTeamIds(executor, userId)
  const [teamCorpora] = soleOwnedTeamIds.length
    ? await executor.select({ count: count() }).from(corpus).where(inArray(corpus.ownerTeamId, soleOwnedTeamIds))
    : [{ count: 0 }]
  return {
    impact: { personalCorpora: personal?.count ?? 0, soleOwnedTeams: soleOwnedTeamIds.length, teamCorpora: teamCorpora?.count ?? 0 },
    soleOwnedTeamIds,
  }
}

export async function getUserDeletionImpact(userId: string): Promise<DeletionImpact> {
  await requireAdmin()
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
  if (!target) {
    throw new NotFoundError('User not found.')
  }
  return (await calculateUserDeletionImpact(db, userId)).impact
}

export async function deleteAdminManagedUser(userId: string, expectedImpact: DeletionImpact) {
  const actor = await requireAdmin()
  if (actor.userId === userId) {
    throw new ForbiddenError('Administrators cannot delete their own current account.')
  }
  await db.transaction(async (trx) => {
    await lockAdminInvariant(trx)
    const ownerTeams = await trx.select({ teamId: teamMembership.teamId }).from(teamMembership).where(and(eq(teamMembership.userId, userId), eq(teamMembership.role, 'owner')))
    const ownerTeamIds = ownerTeams.map(ownerTeam => ownerTeam.teamId)
    if (ownerTeamIds.length) {
      await trx.select({ id: team.id }).from(team).where(inArray(team.id, ownerTeamIds)).orderBy(team.id).for('update')
    }
    await trx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update')
    await assertNotFinalActiveAdmin(trx, userId)
    await trx.select({ id: corpus.id }).from(corpus).where(eq(corpus.ownerUserId, userId)).orderBy(corpus.id).for('update')
    const currentOwnerTeams = await trx.select({ teamId: teamMembership.teamId }).from(teamMembership).where(and(eq(teamMembership.userId, userId), eq(teamMembership.role, 'owner')))
    if (currentOwnerTeams.some(current => !ownerTeamIds.includes(current.teamId))) {
      throw new ForbiddenError('Team ownership changed while deleting this user. Review the impact and try again.')
    }
    const { impact, soleOwnedTeamIds } = await calculateUserDeletionImpact(trx, userId)
    if (impact.personalCorpora !== expectedImpact.personalCorpora
      || impact.soleOwnedTeams !== expectedImpact.soleOwnedTeams
      || impact.teamCorpora !== expectedImpact.teamCorpora) {
      throw new ForbiddenError('Deletion impact changed. Review the updated impact before trying again.')
    }
    if (soleOwnedTeamIds.length) {
      await trx.delete(team).where(inArray(team.id, soleOwnedTeamIds))
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
