'use server'

import type { TeamRole } from '@/db/schema'
import { and, count, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db/drizzle'
import { auditLog, team, teamInvitation, teamMembership, users } from '@/db/schema'
import { ForbiddenError, getRequestActor, NotFoundError } from '@/lib/auth-utils'
import { MAX_OWNED_TEAMS_PER_USER, MAX_PENDING_INVITES_PER_TEAM } from '@/lib/constants'
import { normalizeUsername, validateDisplayName, validateInvitationResponse, validateTeamRole, validateTeamSlug } from '@/lib/identity'
import { getTeamRole } from '@/lib/team-access'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function requireUserActor() {
  const actor = await getRequestActor()
  if (actor.type !== 'user') {
    throw new ForbiddenError()
  }
  return actor
}

async function requireTeamOwner(teamId: string) {
  const actor = await requireUserActor()
  if (actor.role === 'admin') {
    return actor
  }
  if (await getTeamRole(teamId, actor.userId) !== 'owner') {
    throw new ForbiddenError('Only team owners may perform this action.')
  }
  return actor
}

export async function getMyTeams() {
  const actor = await requireUserActor()
  return db.select({
    id: team.id,
    name: team.name,
    slug: team.slug,
    role: teamMembership.role,
    createdAt: team.createdAt,
  })
    .from(teamMembership)
    .innerJoin(team, eq(team.id, teamMembership.teamId))
    .where(eq(teamMembership.userId, actor.userId))
    .orderBy(team.name)
}

export async function getOwnedTeams() {
  const actor = await requireUserActor()
  return db.select({ id: team.id, name: team.name, slug: team.slug })
    .from(teamMembership)
    .innerJoin(team, eq(team.id, teamMembership.teamId))
    .where(and(eq(teamMembership.userId, actor.userId), eq(teamMembership.role, 'owner')))
    .orderBy(team.name)
}

export async function getTeamBySlug(slugValue: string) {
  const actor = await requireUserActor()
  const slug = validateTeamSlug(slugValue)
  const [foundTeam] = await db.select().from(team).where(eq(team.slug, slug)).limit(1)
  if (!foundTeam) {
    throw new NotFoundError('Team not found.')
  }
  const membershipRole = await getTeamRole(foundTeam.id, actor.userId)
  if (!membershipRole && actor.role !== 'admin') {
    throw new NotFoundError('Team not found.')
  }

  const members = await db.select({
    userId: users.id,
    username: users.username,
    name: users.name,
    role: teamMembership.role,
  })
    .from(teamMembership)
    .innerJoin(users, eq(users.id, teamMembership.userId))
    .where(eq(teamMembership.teamId, foundTeam.id))
    .orderBy(users.username)

  const invitations = membershipRole === 'owner' || actor.role === 'admin'
    ? await db.select({
        id: teamInvitation.id,
        username: users.username,
        name: users.name,
        role: teamInvitation.role,
        status: teamInvitation.status,
      })
        .from(teamInvitation)
        .innerJoin(users, eq(users.id, teamInvitation.inviteeUserId))
        .where(eq(teamInvitation.teamId, foundTeam.id))
    : []

  return { team: foundTeam, membershipRole: actor.role === 'admin' ? 'owner' as const : membershipRole, members, invitations }
}

export async function createTeam(nameValue: string, slugValue: string) {
  const actor = await requireUserActor()
  const name = validateDisplayName(nameValue)
  const slug = validateTeamSlug(slugValue)
  const createdTeam = await db.transaction(async (trx) => {
    if (actor.role !== 'admin') {
      const [owned] = await trx.select({ count: count() })
        .from(teamMembership)
        .where(and(eq(teamMembership.userId, actor.userId), eq(teamMembership.role, 'owner')))
      if ((owned?.count ?? 0) >= MAX_OWNED_TEAMS_PER_USER) {
        throw new Error(`You can own at most ${MAX_OWNED_TEAMS_PER_USER} teams.`)
      }
    }
    const [result] = await trx.insert(team).values({ name, slug, createdByUserId: actor.userId }).returning()
    await trx.insert(teamMembership).values({ teamId: result.id, userId: actor.userId, role: 'owner' })
    await trx.insert(auditLog).values({
      actorUserId: actor.userId,
      action: 'team.created',
      targetType: 'team',
      targetId: result.id,
    })
    return result
  })
  revalidatePath('/teams')
  return createdTeam
}

export async function inviteTeamMember(teamId: string, usernameValue: string, role: TeamRole) {
  const actor = await requireTeamOwner(teamId)
  role = validateTeamRole(role)
  const username = normalizeUsername(usernameValue)

  await db.transaction(async (trx) => {
    await lockTeamAndRequireOwner(trx, teamId, actor)
    const [pending] = await trx.select({ count: count() })
      .from(teamInvitation)
      .where(and(eq(teamInvitation.teamId, teamId), eq(teamInvitation.status, 'pending')))
    if ((pending?.count ?? 0) >= MAX_PENDING_INVITES_PER_TEAM) {
      throw new Error(`This team can have at most ${MAX_PENDING_INVITES_PER_TEAM} pending invitations.`)
    }
    const [invitee] = await trx.select({ id: users.id, status: users.status }).from(users).where(eq(users.username, username)).limit(1)
    if (!invitee || invitee.status !== 'active') {
      throw new NotFoundError('No active user has that exact username.')
    }
    const [membership] = await trx.select({ userId: teamMembership.userId })
      .from(teamMembership)
      .where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, invitee.id)))
      .limit(1)
    if (membership) {
      throw new Error('This user is already a team member.')
    }
    await trx.insert(teamInvitation).values({
      teamId,
      inviteeUserId: invitee.id,
      invitedByUserId: actor.userId,
      role,
      status: 'pending',
      respondedAt: null,
    }).onConflictDoUpdate({
      target: [teamInvitation.teamId, teamInvitation.inviteeUserId],
      set: { role, status: 'pending', invitedByUserId: actor.userId, respondedAt: null, updatedAt: new Date() },
    })
    await trx.insert(auditLog).values({
      actorUserId: actor.userId,
      action: 'team.invitation_sent',
      targetType: 'team',
      targetId: teamId,
      metadata: { inviteeUserId: invitee.id, role },
    })
  })
  revalidatePath('/teams')
  revalidatePath('/invitations')
}

export async function respondToTeamInvitation(invitationId: string, response: 'accepted' | 'declined') {
  const actor = await requireUserActor()
  response = validateInvitationResponse(response)
  await db.transaction(async (trx) => {
    const [invitation] = await trx.select().from(teamInvitation).where(eq(teamInvitation.id, invitationId)).limit(1)
    if (!invitation || invitation.inviteeUserId !== actor.userId || invitation.status !== 'pending') {
      throw new NotFoundError('Pending invitation not found.')
    }
    if (response === 'accepted') {
      await trx.insert(teamMembership).values({ teamId: invitation.teamId, userId: actor.userId, role: invitation.role })
    }
    await trx.update(teamInvitation).set({ status: response, respondedAt: new Date(), updatedAt: new Date() }).where(eq(teamInvitation.id, invitationId))
    await trx.insert(auditLog).values({
      actorUserId: actor.userId,
      action: `team.invitation_${response}`,
      targetType: 'team',
      targetId: invitation.teamId,
      metadata: { invitationId },
    })
  })
  revalidatePath('/teams')
  revalidatePath('/invitations')
}

async function lockTeamAndRequireOwner(trx: DbTransaction, teamId: string, actor: Awaited<ReturnType<typeof requireUserActor>>) {
  await trx.execute(sql`SELECT 1 FROM ${team} WHERE ${team.id} = ${teamId} FOR UPDATE`)
  const [foundTeam] = await trx.select({ id: team.id }).from(team).where(eq(team.id, teamId)).limit(1)
  if (!foundTeam) {
    throw new NotFoundError('Team not found.')
  }
  if (actor.role === 'admin') {
    return
  }
  const [membership] = await trx.select({ role: teamMembership.role })
    .from(teamMembership)
    .where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, actor.userId)))
    .limit(1)
  if (membership?.role !== 'owner') {
    throw new ForbiddenError('Only team owners may perform this action.')
  }
}

async function assertOwnerWillRemain(trx: DbTransaction, teamId: string, userId: string) {
  const [membership] = await trx.select({ role: teamMembership.role }).from(teamMembership).where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, userId))).limit(1)
  if (membership?.role !== 'owner') {
    return
  }
  const [owners] = await trx.select({ count: count() }).from(teamMembership).where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.role, 'owner')))
  if ((owners?.count ?? 0) <= 1) {
    throw new ForbiddenError('A team must retain at least one owner.')
  }
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: TeamRole) {
  const actor = await requireTeamOwner(teamId)
  role = validateTeamRole(role)
  await db.transaction(async (trx) => {
    await lockTeamAndRequireOwner(trx, teamId, actor)
    if (role === 'member') {
      await assertOwnerWillRemain(trx, teamId, userId)
    }
    const result = await trx.update(teamMembership).set({ role, updatedAt: new Date() }).where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, userId))).returning()
    if (!result.length) {
      throw new NotFoundError('Team member not found.')
    }
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'team.member_role_updated', targetType: 'team', targetId: teamId, metadata: { userId, role } })
  })
  revalidatePath('/teams')
}

export async function removeTeamMember(teamId: string, userId: string) {
  const actor = await requireTeamOwner(teamId)
  await db.transaction(async (trx) => {
    await lockTeamAndRequireOwner(trx, teamId, actor)
    await assertOwnerWillRemain(trx, teamId, userId)
    const removed = await trx.delete(teamMembership).where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, userId))).returning()
    if (!removed.length) {
      throw new NotFoundError('Team member not found.')
    }
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'team.member_removed', targetType: 'team', targetId: teamId, metadata: { userId } })
  })
  revalidatePath('/teams')
}

export async function leaveTeam(teamId: string) {
  const actor = await requireUserActor()
  await db.transaction(async (trx) => {
    await trx.execute(sql`SELECT 1 FROM ${team} WHERE ${team.id} = ${teamId} FOR UPDATE`)
    const [membership] = await trx.select({ role: teamMembership.role })
      .from(teamMembership)
      .where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, actor.userId)))
      .limit(1)
    if (!membership) {
      throw new NotFoundError('Team membership not found.')
    }
    await assertOwnerWillRemain(trx, teamId, actor.userId)
    await trx.delete(teamMembership).where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, actor.userId)))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'team.member_left', targetType: 'team', targetId: teamId })
  })
  revalidatePath('/teams')
  redirect('/teams')
}

export async function cancelTeamInvitation(invitationId: string) {
  const actor = await requireUserActor()
  await db.transaction(async (trx) => {
    const [invitation] = await trx.select({ teamId: teamInvitation.teamId, status: teamInvitation.status })
      .from(teamInvitation)
      .where(eq(teamInvitation.id, invitationId))
      .limit(1)
    if (!invitation) {
      throw new NotFoundError('Team invitation not found.')
    }
    await lockTeamAndRequireOwner(trx, invitation.teamId, actor)
    if (invitation.status !== 'pending') {
      throw new ForbiddenError('Only pending invitations can be cancelled.')
    }
    await trx.update(teamInvitation).set({ status: 'revoked', respondedAt: new Date(), updatedAt: new Date() }).where(eq(teamInvitation.id, invitationId))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'team.invitation_cancelled', targetType: 'team', targetId: invitation.teamId, metadata: { invitationId } })
  })
  revalidatePath('/teams')
  revalidatePath('/invitations')
}

export async function deleteTeam(teamId: string) {
  const actor = await requireTeamOwner(teamId)
  await db.transaction(async (trx) => {
    await lockTeamAndRequireOwner(trx, teamId, actor)
    const deleted = await trx.delete(team).where(eq(team.id, teamId)).returning({ id: team.id })
    if (!deleted.length) {
      throw new NotFoundError('Team not found.')
    }
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'team.deleted', targetType: 'team', targetId: teamId })
  })
  revalidatePath('/teams')
  revalidatePath('/')
  redirect('/teams')
}
