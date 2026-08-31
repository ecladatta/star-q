'use server'

import type { CorpusCollaboratorRole } from '@/db/schema'
import { and, count, eq, sql } from 'drizzle-orm'
import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/db/drizzle'
import { auditLog, corpus, corpusCollaboration, team, teamInvitation, teamMembership, users } from '@/db/schema'
import { ForbiddenError, getRequestActor, NotFoundError } from '@/lib/auth-utils'
import { MAX_PENDING_INVITES_PER_CORPUS } from '@/lib/constants'
import { requireManageCorpus } from '@/lib/corpus-access'
import { normalizeTeamSlug, normalizeUsername, validateCorpusCollaboratorRole, validateInvitationResponse } from '@/lib/identity'
import { getTeamRole } from '@/lib/team-access'

async function requireUserActor() {
  const actor = await getRequestActor()
  if (actor.type !== 'user') {
    throw new ForbiddenError()
  }
  return actor
}

export async function getCorpusCollaborations(corpusId: string) {
  await requireManageCorpus(corpusId)
  const rows = await db.select({
    id: corpusCollaboration.id,
    targetUserId: corpusCollaboration.targetUserId,
    targetTeamId: corpusCollaboration.targetTeamId,
    username: users.username,
    userName: users.name,
    teamSlug: team.slug,
    teamName: team.name,
    role: corpusCollaboration.role,
    status: corpusCollaboration.status,
    createdAt: corpusCollaboration.createdAt,
  })
    .from(corpusCollaboration)
    .leftJoin(users, eq(users.id, corpusCollaboration.targetUserId))
    .leftJoin(team, eq(team.id, corpusCollaboration.targetTeamId))
    .where(eq(corpusCollaboration.corpusId, corpusId))
  return rows
}

async function upsertCollaboration(input: {
  corpusId: string
  role: CorpusCollaboratorRole
  actorUserId: string
  status: 'pending' | 'accepted'
  targetUserId?: string
  targetTeamId?: string
}) {
  const respondedAt = input.status === 'accepted' ? new Date() : null
  const values = {
    corpusId: input.corpusId,
    role: input.role,
    targetUserId: input.targetUserId ?? null,
    targetTeamId: input.targetTeamId ?? null,
    invitedByUserId: input.actorUserId,
    status: input.status,
    respondedByUserId: input.status === 'accepted' ? input.actorUserId : null,
    respondedAt,
  }
  const target = input.targetUserId
    ? [corpusCollaboration.corpusId, corpusCollaboration.targetUserId]
    : [corpusCollaboration.corpusId, corpusCollaboration.targetTeamId]

  await db.insert(corpusCollaboration).values(values).onConflictDoUpdate({
    target,
    set: {
      role: input.role,
      status: input.status,
      invitedByUserId: input.actorUserId,
      respondedByUserId: input.status === 'accepted' ? input.actorUserId : null,
      respondedAt,
      updatedAt: new Date(),
    },
  })
}

async function assertWithinPendingInviteLimit(corpusId: string) {
  const [pending] = await db.select({ count: count() })
    .from(corpusCollaboration)
    .where(and(eq(corpusCollaboration.corpusId, corpusId), eq(corpusCollaboration.status, 'pending')))
  if ((pending?.count ?? 0) >= MAX_PENDING_INVITES_PER_CORPUS) {
    throw new Error(`This corpus can have at most ${MAX_PENDING_INVITES_PER_CORPUS} pending invitations.`)
  }
}

export async function inviteUserToCorpus(corpusId: string, usernameValue: string, role: CorpusCollaboratorRole) {
  await requireManageCorpus(corpusId)
  const actor = await requireUserActor()
  role = validateCorpusCollaboratorRole(role)
  const status = actor.role === 'admin' ? 'accepted' : 'pending'
  if (status === 'pending') {
    await assertWithinPendingInviteLimit(corpusId)
  }
  const username = normalizeUsername(usernameValue)
  const [targetUser] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.username, username)).limit(1)
  if (!targetUser || targetUser.status !== 'active') {
    throw new NotFoundError('No active user has that exact username.')
  }

  const [resource] = await db.select({ ownerUserId: corpus.ownerUserId }).from(corpus).where(eq(corpus.id, corpusId)).limit(1)
  if (resource?.ownerUserId === targetUser.id) {
    throw new Error('The corpus owner cannot be added as a collaborator.')
  }

  await upsertCollaboration({ corpusId, role, status, actorUserId: actor.userId, targetUserId: targetUser.id })
  await db.insert(auditLog).values({
    actorUserId: actor.userId,
    action: status === 'accepted' ? 'corpus.user_added' : 'corpus.user_invited',
    targetType: 'corpus',
    targetId: corpusId,
    metadata: { targetUserId: targetUser.id, role },
  })
  revalidatePath(`/corpus/${corpusId}/access`)
  revalidatePath('/invitations')
  revalidatePath('/')
}

export async function inviteTeamToCorpus(corpusId: string, slugValue: string, role: CorpusCollaboratorRole) {
  await requireManageCorpus(corpusId)
  const actor = await requireUserActor()
  role = validateCorpusCollaboratorRole(role)
  const status = actor.role === 'admin' ? 'accepted' : 'pending'
  if (status === 'pending') {
    await assertWithinPendingInviteLimit(corpusId)
  }
  const slug = normalizeTeamSlug(slugValue)
  const [targetTeam] = await db.select({ id: team.id }).from(team).where(eq(team.slug, slug)).limit(1)
  if (!targetTeam) {
    throw new NotFoundError('No team has that exact slug.')
  }
  const [resource] = await db.select({ ownerTeamId: corpus.ownerTeamId }).from(corpus).where(eq(corpus.id, corpusId)).limit(1)
  if (resource?.ownerTeamId === targetTeam.id) {
    throw new Error('The owning team cannot be added as a collaborator.')
  }

  await upsertCollaboration({ corpusId, role, status, actorUserId: actor.userId, targetTeamId: targetTeam.id })
  await db.insert(auditLog).values({
    actorUserId: actor.userId,
    action: status === 'accepted' ? 'corpus.team_added' : 'corpus.team_invited',
    targetType: 'corpus',
    targetId: corpusId,
    metadata: { targetTeamId: targetTeam.id, role },
  })
  revalidatePath(`/corpus/${corpusId}/access`)
  revalidatePath('/invitations')
  revalidatePath('/')
}

export async function respondToCorpusInvitation(invitationId: string, response: 'accepted' | 'declined') {
  const actor = await requireUserActor()
  response = validateInvitationResponse(response)
  await db.transaction(async (trx) => {
    const [invitation] = await trx.select().from(corpusCollaboration).where(eq(corpusCollaboration.id, invitationId)).limit(1)
    if (!invitation || invitation.status !== 'pending') {
      throw new NotFoundError('Pending invitation not found.')
    }

    const ownsTarget = invitation.targetUserId === actor.userId
      || Boolean(invitation.targetTeamId && (actor.role === 'admin' || await getTeamRole(invitation.targetTeamId, actor.userId) === 'owner'))
    if (!ownsTarget) {
      throw new NotFoundError('Pending invitation not found.')
    }

    await trx.update(corpusCollaboration).set({
      status: response,
      respondedByUserId: actor.userId,
      respondedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(corpusCollaboration.id, invitationId))
    await trx.insert(auditLog).values({
      actorUserId: actor.userId,
      action: `corpus.invitation_${response}`,
      targetType: 'corpus',
      targetId: invitation.corpusId,
      metadata: { invitationId },
    })
  })
  revalidatePath('/invitations')
  revalidatePath('/')
}

export async function updateCorpusCollaboratorRole(collaborationId: string, role: CorpusCollaboratorRole) {
  role = validateCorpusCollaboratorRole(role)
  const [collaboration] = await db.select().from(corpusCollaboration).where(eq(corpusCollaboration.id, collaborationId)).limit(1)
  if (!collaboration) {
    throw new NotFoundError('Collaboration not found.')
  }
  await requireManageCorpus(collaboration.corpusId)
  const actor = await requireUserActor()
  await db.update(corpusCollaboration).set({ role, updatedAt: new Date() }).where(eq(corpusCollaboration.id, collaborationId))
  await db.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.collaborator_role_updated', targetType: 'corpus', targetId: collaboration.corpusId, metadata: { collaborationId, role } })
  revalidatePath(`/corpus/${collaboration.corpusId}/access`)
}

export async function revokeCorpusCollaboration(collaborationId: string) {
  const [collaboration] = await db.select().from(corpusCollaboration).where(eq(corpusCollaboration.id, collaborationId)).limit(1)
  if (!collaboration) {
    throw new NotFoundError('Collaboration not found.')
  }
  await requireManageCorpus(collaboration.corpusId)
  const actor = await requireUserActor()
  await db.update(corpusCollaboration).set({ status: 'revoked', updatedAt: new Date() }).where(eq(corpusCollaboration.id, collaborationId))
  await db.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.collaboration_revoked', targetType: 'corpus', targetId: collaboration.corpusId, metadata: { collaborationId } })
  revalidatePath(`/corpus/${collaboration.corpusId}/access`)
  revalidatePath('/')
}

export async function leaveCorpusCollaboration(collaborationId: string) {
  const actor = await requireUserActor()
  await db.transaction(async (trx) => {
    const [collaboration] = await trx.select().from(corpusCollaboration).where(eq(corpusCollaboration.id, collaborationId)).limit(1)
    if (!collaboration || collaboration.status !== 'accepted') {
      throw new NotFoundError('Accepted collaboration not found.')
    }

    let canLeave = collaboration.targetUserId === actor.userId
    if (collaboration.targetTeamId) {
      await trx.execute(sql`SELECT 1 FROM ${team} WHERE ${team.id} = ${collaboration.targetTeamId} FOR UPDATE`)
      const [membership] = await trx.select({ role: teamMembership.role })
        .from(teamMembership)
        .where(and(
          eq(teamMembership.teamId, collaboration.targetTeamId),
          eq(teamMembership.userId, actor.userId),
        ))
        .limit(1)
      canLeave = actor.role === 'admin' || membership?.role === 'owner'
    }
    if (!canLeave) {
      throw new NotFoundError('Accepted collaboration not found.')
    }

    await trx.update(corpusCollaboration).set({ status: 'revoked', respondedByUserId: actor.userId, respondedAt: new Date(), updatedAt: new Date() }).where(eq(corpusCollaboration.id, collaborationId))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.collaboration_left', targetType: 'corpus', targetId: collaboration.corpusId, metadata: { collaborationId, targetTeamId: collaboration.targetTeamId } })
  })
  revalidatePath('/invitations')
  revalidatePath('/')
}

export async function getMyAcceptedCorpusCollaborations() {
  const actor = await requireUserActor()
  const direct = await db.select({
    id: corpusCollaboration.id,
    corpusId: corpus.id,
    corpusTitle: corpus.title,
    role: corpusCollaboration.role,
  })
    .from(corpusCollaboration)
    .innerJoin(corpus, eq(corpus.id, corpusCollaboration.corpusId))
    .where(and(
      eq(corpusCollaboration.targetUserId, actor.userId),
      eq(corpusCollaboration.status, 'accepted'),
    ))

  const forTeams = await db.select({
    id: corpusCollaboration.id,
    corpusId: corpus.id,
    corpusTitle: corpus.title,
    role: corpusCollaboration.role,
    teamName: team.name,
    teamSlug: team.slug,
  })
    .from(corpusCollaboration)
    .innerJoin(team, eq(team.id, corpusCollaboration.targetTeamId))
    .innerJoin(teamMembership, eq(teamMembership.teamId, team.id))
    .innerJoin(corpus, eq(corpus.id, corpusCollaboration.corpusId))
    .where(and(
      eq(teamMembership.userId, actor.userId),
      eq(teamMembership.role, 'owner'),
      eq(corpusCollaboration.status, 'accepted'),
    ))

  return { direct, forTeams }
}

export async function getPendingInvitations() {
  const actor = await requireUserActor()
  const teamInvitations = await db.select({
    id: teamInvitation.id,
    kind: teamInvitation.status,
    teamId: team.id,
    teamName: team.name,
    teamSlug: team.slug,
    role: teamInvitation.role,
    createdAt: teamInvitation.createdAt,
  })
    .from(teamInvitation)
    .innerJoin(team, eq(team.id, teamInvitation.teamId))
    .where(and(eq(teamInvitation.inviteeUserId, actor.userId), eq(teamInvitation.status, 'pending')))

  const userCorpusInvitations = await db.select({
    id: corpusCollaboration.id,
    corpusId: corpus.id,
    corpusTitle: corpus.title,
    role: corpusCollaboration.role,
    createdAt: corpusCollaboration.createdAt,
  })
    .from(corpusCollaboration)
    .innerJoin(corpus, eq(corpus.id, corpusCollaboration.corpusId))
    .where(and(eq(corpusCollaboration.targetUserId, actor.userId), eq(corpusCollaboration.status, 'pending')))

  const teamCorpusInvitations = await db.select({
    id: corpusCollaboration.id,
    corpusId: corpus.id,
    corpusTitle: corpus.title,
    teamId: team.id,
    teamName: team.name,
    teamSlug: team.slug,
    role: corpusCollaboration.role,
    createdAt: corpusCollaboration.createdAt,
  })
    .from(corpusCollaboration)
    .innerJoin(team, eq(team.id, corpusCollaboration.targetTeamId))
    .innerJoin(teamMembership, eq(teamMembership.teamId, team.id))
    .innerJoin(corpus, eq(corpus.id, corpusCollaboration.corpusId))
    .where(and(
      eq(teamMembership.userId, actor.userId),
      eq(teamMembership.role, 'owner'),
      eq(corpusCollaboration.status, 'pending'),
    ))

  return { teamInvitations, userCorpusInvitations, teamCorpusInvitations }
}

const getCachedPendingInvitationCount = unstable_cache(
  async (userId: string) => {
    const [teamInvitations] = await db.select({ count: count() })
      .from(teamInvitation)
      .where(and(eq(teamInvitation.inviteeUserId, userId), eq(teamInvitation.status, 'pending')))
    const [userCorpusInvitations] = await db.select({ count: count() })
      .from(corpusCollaboration)
      .where(and(eq(corpusCollaboration.targetUserId, userId), eq(corpusCollaboration.status, 'pending')))
    const [teamCorpusInvitations] = await db.select({ count: count() })
      .from(corpusCollaboration)
      .innerJoin(teamMembership, eq(teamMembership.teamId, corpusCollaboration.targetTeamId))
      .where(and(
        eq(teamMembership.userId, userId),
        eq(teamMembership.role, 'owner'),
        eq(corpusCollaboration.status, 'pending'),
      ))
    return (teamInvitations?.count ?? 0) + (userCorpusInvitations?.count ?? 0) + (teamCorpusInvitations?.count ?? 0)
  },
  ['pending-invitation-count'],
  { revalidate: 60 },
)

export async function getPendingInvitationCount(): Promise<number> {
  const actor = await requireUserActor()
  return getCachedPendingInvitationCount(actor.userId)
}
