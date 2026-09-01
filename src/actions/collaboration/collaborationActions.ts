'use server'

import type { DbTransaction } from '@/db/drizzle'
import type { Corpus, CorpusCollaboratorRole } from '@/db/schema'
import { and, count, eq } from 'drizzle-orm'
import { revalidatePath, unstable_cache } from 'next/cache'
import { db } from '@/db/drizzle'
import { auditLog, corpus, corpusCollaboration, team, teamInvitation, teamMembership, users } from '@/db/schema'
import { ForbiddenError, getRequestActor, NotFoundError } from '@/lib/auth-utils'
import { MAX_PENDING_INVITES_PER_CORPUS } from '@/lib/constants'
import { lockCorpusAndRequireManager, requireManageCorpus } from '@/lib/corpus-access'
import { normalizeTeamSlug, normalizeUsername, validateCorpusCollaboratorRole, validateInvitationResponse } from '@/lib/identity'

type CollaborationTarget = { type: 'user', id: string } | { type: 'team', id: string }

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

async function upsertCollaboration(trx: DbTransaction, input: {
  corpusId: string
  role: CorpusCollaboratorRole
  actorUserId: string
  status: 'pending' | 'accepted'
  respondedByUserId: string | null
  respondedAt: Date | null
  target: CollaborationTarget
}) {
  const targetUserId = input.target.type === 'user' ? input.target.id : null
  const targetTeamId = input.target.type === 'team' ? input.target.id : null
  const values = {
    corpusId: input.corpusId,
    role: input.role,
    targetUserId,
    targetTeamId,
    invitedByUserId: input.actorUserId,
    status: input.status,
    respondedByUserId: input.respondedByUserId,
    respondedAt: input.respondedAt,
  }
  const conflictTarget = input.target.type === 'user'
    ? [corpusCollaboration.corpusId, corpusCollaboration.targetUserId]
    : [corpusCollaboration.corpusId, corpusCollaboration.targetTeamId]

  await trx.insert(corpusCollaboration).values(values).onConflictDoUpdate({
    target: conflictTarget,
    set: {
      role: input.role,
      status: input.status,
      invitedByUserId: input.actorUserId,
      respondedByUserId: input.respondedByUserId,
      respondedAt: input.respondedAt,
      updatedAt: new Date(),
    },
  })
}

async function assertWithinPendingInviteLimit(trx: DbTransaction, corpusId: string) {
  const [pending] = await trx.select({ count: count() })
    .from(corpusCollaboration)
    .where(and(eq(corpusCollaboration.corpusId, corpusId), eq(corpusCollaboration.status, 'pending')))
  if ((pending?.count ?? 0) >= MAX_PENDING_INVITES_PER_CORPUS) {
    throw new Error(`This corpus can have at most ${MAX_PENDING_INVITES_PER_CORPUS} pending invitations.`)
  }
}

async function getLockedManagedCollaboration(
  trx: DbTransaction,
  collaborationId: string,
  corpusId: string,
  actor: Awaited<ReturnType<typeof requireUserActor>>,
) {
  await lockCorpusAndRequireManager(trx, corpusId, actor)
  const [collaboration] = await trx.select().from(corpusCollaboration).where(eq(corpusCollaboration.id, collaborationId)).for('update')
  if (!collaboration) {
    throw new NotFoundError('Collaboration not found.')
  }
  return collaboration
}

async function inviteCorpusTarget(
  trx: DbTransaction,
  input: {
    corpusId: string
    role: CorpusCollaboratorRole
    actor: Awaited<ReturnType<typeof requireUserActor>>
    resource: Corpus
    target: CollaborationTarget
  },
): Promise<void> {
  if (input.target.type === 'team' && input.resource.ownerTeamId === input.target.id) {
    throw new Error('The owning team cannot be added as a collaborator.')
  }

  const targetCondition = input.target.type === 'user'
    ? eq(corpusCollaboration.targetUserId, input.target.id)
    : eq(corpusCollaboration.targetTeamId, input.target.id)
  const [existing] = await trx.select().from(corpusCollaboration).where(and(
    eq(corpusCollaboration.corpusId, input.corpusId),
    targetCondition,
  )).limit(1)
  const preservesAcceptedAccess = input.actor.role !== 'admin' && existing?.status === 'accepted'
  const status = input.actor.role === 'admin' || preservesAcceptedAccess ? 'accepted' : 'pending'
  if (existing?.role === input.role && existing.status === status) {
    return
  }
  if (status === 'pending' && existing?.status !== 'pending') {
    await assertWithinPendingInviteLimit(trx, input.corpusId)
  }
  const respondedAt = input.actor.role === 'admin' ? new Date() : preservesAcceptedAccess ? existing?.respondedAt ?? null : null
  const respondedByUserId = input.actor.role === 'admin' ? input.actor.userId : preservesAcceptedAccess ? existing?.respondedByUserId ?? null : null
  await upsertCollaboration(trx, {
    corpusId: input.corpusId,
    role: input.role,
    status,
    respondedAt,
    respondedByUserId,
    actorUserId: input.actor.userId,
    target: input.target,
  })
  const targetMetadata = input.target.type === 'user'
    ? { targetUserId: input.target.id, role: input.role }
    : { targetTeamId: input.target.id, role: input.role }
  await trx.insert(auditLog).values({
    actorUserId: input.actor.userId,
    action: input.actor.role === 'admin'
      ? `corpus.${input.target.type}_added`
      : preservesAcceptedAccess ? 'corpus.collaborator_role_updated' : `corpus.${input.target.type}_invited`,
    targetType: 'corpus',
    targetId: input.corpusId,
    metadata: targetMetadata,
  })
}

export async function inviteUserToCorpus(corpusId: string, usernameValue: string, role: CorpusCollaboratorRole) {
  const actor = await requireUserActor()
  role = validateCorpusCollaboratorRole(role)
  const username = normalizeUsername(usernameValue)
  await db.transaction(async (trx) => {
    const resource = await lockCorpusAndRequireManager(trx, corpusId, actor)
    const [targetUser] = await trx.select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .for('update')
    if (!targetUser || targetUser.status !== 'active') {
      throw new NotFoundError('No active user has that exact username.')
    }
    await inviteCorpusTarget(trx, { corpusId, role, actor, resource, target: { type: 'user', id: targetUser.id } })
  })
  revalidatePath(`/corpus/${corpusId}/access`)
  revalidatePath('/invitations')
  revalidatePath('/')
}

export async function inviteTeamToCorpus(corpusId: string, slugValue: string, role: CorpusCollaboratorRole) {
  const actor = await requireUserActor()
  role = validateCorpusCollaboratorRole(role)
  const slug = normalizeTeamSlug(slugValue)
  await db.transaction(async (trx) => {
    const resource = await lockCorpusAndRequireManager(trx, corpusId, actor)
    const [targetTeam] = await trx.select({ id: team.id, kind: team.kind }).from(team).where(eq(team.slug, slug)).limit(1).for('update')
    if (!targetTeam) {
      throw new NotFoundError('No team has that exact slug.')
    }
    if (targetTeam.kind === 'personal') {
      throw new Error('Personal teams cannot be invited to corpora.')
    }
    await inviteCorpusTarget(trx, { corpusId, role, actor, resource, target: { type: 'team', id: targetTeam.id } })
  })
  revalidatePath(`/corpus/${corpusId}/access`)
  revalidatePath('/invitations')
  revalidatePath('/')
}

export async function respondToCorpusInvitation(invitationId: string, response: 'accepted' | 'declined') {
  const actor = await requireUserActor()
  response = validateInvitationResponse(response)
  const [candidate] = await db.select({ corpusId: corpusCollaboration.corpusId })
    .from(corpusCollaboration)
    .where(eq(corpusCollaboration.id, invitationId))
    .limit(1)
  if (!candidate) {
    throw new NotFoundError('Pending invitation not found.')
  }
  await db.transaction(async (trx) => {
    const [resource] = await trx.select({ id: corpus.id }).from(corpus).where(eq(corpus.id, candidate.corpusId)).for('update')
    const [invitation] = await trx.select().from(corpusCollaboration).where(eq(corpusCollaboration.id, invitationId)).for('update')
    if (!resource || !invitation || invitation.status !== 'pending') {
      throw new NotFoundError('Pending invitation not found.')
    }

    let ownsTarget = invitation.targetUserId === actor.userId
    if (invitation.targetTeamId) {
      await trx.select({ id: team.id }).from(team).where(eq(team.id, invitation.targetTeamId)).for('update')
      const [membership] = await trx.select({ role: teamMembership.role })
        .from(teamMembership)
        .where(and(eq(teamMembership.teamId, invitation.targetTeamId), eq(teamMembership.userId, actor.userId)))
        .limit(1)
      ownsTarget = actor.role === 'admin' || membership?.role === 'owner'
    }
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
  const [candidate] = await db.select({ corpusId: corpusCollaboration.corpusId }).from(corpusCollaboration).where(eq(corpusCollaboration.id, collaborationId)).limit(1)
  if (!candidate) {
    throw new NotFoundError('Collaboration not found.')
  }
  const actor = await requireUserActor()
  await db.transaction(async (trx) => {
    const collaboration = await getLockedManagedCollaboration(trx, collaborationId, candidate.corpusId, actor)
    if (collaboration.role === role) {
      return
    }
    await trx.update(corpusCollaboration).set({ role, updatedAt: new Date() }).where(eq(corpusCollaboration.id, collaborationId))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.collaborator_role_updated', targetType: 'corpus', targetId: collaboration.corpusId, metadata: { collaborationId, role } })
  })
  revalidatePath(`/corpus/${candidate.corpusId}/access`)
}

export async function revokeCorpusCollaboration(collaborationId: string) {
  const [candidate] = await db.select({ corpusId: corpusCollaboration.corpusId }).from(corpusCollaboration).where(eq(corpusCollaboration.id, collaborationId)).limit(1)
  if (!candidate) {
    throw new NotFoundError('Collaboration not found.')
  }
  const actor = await requireUserActor()
  await db.transaction(async (trx) => {
    const collaboration = await getLockedManagedCollaboration(trx, collaborationId, candidate.corpusId, actor)
    if (collaboration.status === 'revoked') {
      return
    }
    await trx.update(corpusCollaboration).set({ status: 'revoked', updatedAt: new Date() }).where(eq(corpusCollaboration.id, collaborationId))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.collaboration_revoked', targetType: 'corpus', targetId: collaboration.corpusId, metadata: { collaborationId } })
  })
  revalidatePath(`/corpus/${candidate.corpusId}/access`)
  revalidatePath('/')
}

export async function leaveCorpusCollaboration(collaborationId: string) {
  const actor = await requireUserActor()
  const [candidate] = await db.select({ corpusId: corpusCollaboration.corpusId })
    .from(corpusCollaboration)
    .where(eq(corpusCollaboration.id, collaborationId))
    .limit(1)
  if (!candidate) {
    throw new NotFoundError('Accepted collaboration not found.')
  }
  await db.transaction(async (trx) => {
    const [resource] = await trx.select({ id: corpus.id }).from(corpus).where(eq(corpus.id, candidate.corpusId)).for('update')
    const [collaboration] = await trx.select().from(corpusCollaboration).where(eq(corpusCollaboration.id, collaborationId)).for('update')
    if (!resource || !collaboration || collaboration.status !== 'accepted') {
      throw new NotFoundError('Accepted collaboration not found.')
    }

    let canLeave = collaboration.targetUserId === actor.userId
    if (collaboration.targetTeamId) {
      await trx.select({ id: team.id }).from(team).where(eq(team.id, collaboration.targetTeamId)).for('update')
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
  const [direct, forTeams] = await Promise.all([
    db.select({
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
      )),
    db.select({
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
      )),
  ])

  return { direct, forTeams }
}

export async function getPendingInvitations() {
  const actor = await requireUserActor()
  const [teamInvitations, userCorpusInvitations, teamCorpusInvitations] = await Promise.all([
    db.select({
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
      .where(and(eq(teamInvitation.inviteeUserId, actor.userId), eq(teamInvitation.status, 'pending'))),
    db.select({
      id: corpusCollaboration.id,
      corpusId: corpus.id,
      corpusTitle: corpus.title,
      role: corpusCollaboration.role,
      createdAt: corpusCollaboration.createdAt,
    })
      .from(corpusCollaboration)
      .innerJoin(corpus, eq(corpus.id, corpusCollaboration.corpusId))
      .where(and(eq(corpusCollaboration.targetUserId, actor.userId), eq(corpusCollaboration.status, 'pending'))),
    db.select({
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
      )),
  ])

  return { teamInvitations, userCorpusInvitations, teamCorpusInvitations }
}

const getCachedPendingInvitationCount = unstable_cache(
  async (userId: string) => {
    const [[teamInvitations], [userCorpusInvitations], [teamCorpusInvitations]] = await Promise.all([
      db.select({ count: count() })
        .from(teamInvitation)
        .where(and(eq(teamInvitation.inviteeUserId, userId), eq(teamInvitation.status, 'pending'))),
      db.select({ count: count() })
        .from(corpusCollaboration)
        .where(and(eq(corpusCollaboration.targetUserId, userId), eq(corpusCollaboration.status, 'pending'))),
      db.select({ count: count() })
        .from(corpusCollaboration)
        .innerJoin(teamMembership, eq(teamMembership.teamId, corpusCollaboration.targetTeamId))
        .where(and(
          eq(teamMembership.userId, userId),
          eq(teamMembership.role, 'owner'),
          eq(corpusCollaboration.status, 'pending'),
        )),
    ])
    return (teamInvitations?.count ?? 0)
      + (userCorpusInvitations?.count ?? 0)
      + (teamCorpusInvitations?.count ?? 0)
  },
  ['pending-invitation-count'],
  { revalidate: 60 },
)

export async function getPendingInvitationCount(): Promise<number> {
  const actor = await requireUserActor()
  return getCachedPendingInvitationCount(actor.userId)
}
