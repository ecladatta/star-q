import type { DbTransaction } from '@/db/drizzle'
import type { Corpus } from '@/db/schema'
import type { AuthenticatedActor, RequestActor } from '@/lib/auth-utils'
import type { CorpusAccess } from '@/lib/corpus-access-policy'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { annotation, corpus, corpusCollaboration, corpusCustomEntity, document, team, teamMembership } from '@/db/schema'
import { ForbiddenError, getRequestActor, NotFoundError } from '@/lib/auth-utils'
import { hasMinimumCorpusAccess, resolveCorpusAccess } from '@/lib/corpus-access-policy'

export type { CorpusAccess, CorpusAccessFacts } from '@/lib/corpus-access-policy'
export { corpusAccessValues, resolveCorpusAccess } from '@/lib/corpus-access-policy'

export async function getCorpusAccessForActor(corpusId: string, actor: RequestActor): Promise<CorpusAccess | null> {
  const [resource] = await db.select().from(corpus).where(eq(corpus.id, corpusId)).limit(1)
  if (!resource) {
    return null
  }

  if (actor.type !== 'user' || actor.role === 'admin') {
    return resolveCorpusAccess({
      actorType: actor.type,
      visibility: resource.visibility,
      isAdmin: actor.type === 'user' && actor.role === 'admin',
    })
  }

  let owningTeamRole: 'owner' | 'member' | null = null

  if (resource.ownerTeamId) {
    const [membership] = await db
      .select({ role: teamMembership.role })
      .from(teamMembership)
      .where(and(
        eq(teamMembership.teamId, resource.ownerTeamId),
        eq(teamMembership.userId, actor.userId),
      ))
      .limit(1)
    if (membership) {
      owningTeamRole = membership.role
    }
  }

  const directCollaborations = await db
    .select({ role: corpusCollaboration.role })
    .from(corpusCollaboration)
    .where(and(
      eq(corpusCollaboration.corpusId, corpusId),
      eq(corpusCollaboration.targetUserId, actor.userId),
      eq(corpusCollaboration.status, 'accepted'),
    ))
  const teamCollaborations = await db
    .select({ role: corpusCollaboration.role })
    .from(corpusCollaboration)
    .innerJoin(teamMembership, eq(teamMembership.teamId, corpusCollaboration.targetTeamId))
    .where(and(
      eq(corpusCollaboration.corpusId, corpusId),
      eq(corpusCollaboration.status, 'accepted'),
      eq(teamMembership.userId, actor.userId),
    ))
  return resolveCorpusAccess({
    actorType: actor.type,
    visibility: resource.visibility,
    owningTeamRole,
    directCollaborationRoles: directCollaborations.map(collaboration => collaboration.role),
    teamCollaborationRoles: teamCollaborations.map(collaboration => collaboration.role),
  })
}

export async function getCorpusAccess(corpusId: string): Promise<CorpusAccess | null> {
  return getCorpusAccessForActor(corpusId, await getRequestActor())
}

export async function requireCorpusAccess(corpusId: string, minimum: CorpusAccess): Promise<CorpusAccess> {
  const actor = await getRequestActor()
  const access = await getCorpusAccessForActor(corpusId, actor)
  if (!access) {
    throw new NotFoundError()
  }
  if (!hasMinimumCorpusAccess(access, minimum)) {
    throw new ForbiddenError()
  }
  return access
}

export async function requireViewCorpus(corpusId: string): Promise<string | null> {
  await requireCorpusAccess(corpusId, 'viewer')
  const actor = await getRequestActor()
  return actor.type === 'user' ? actor.userId : null
}

export async function requireEditCorpus(corpusId: string): Promise<void> {
  await requireCorpusAccess(corpusId, 'editor')
}

export async function requireManageCorpus(corpusId: string): Promise<void> {
  await requireCorpusAccess(corpusId, 'manager')
}

export async function lockCorpusAndRequireManager(trx: DbTransaction, corpusId: string, actor: AuthenticatedActor): Promise<Corpus> {
  const [resource] = await trx.select().from(corpus).where(eq(corpus.id, corpusId)).for('update')
  if (!resource) {
    throw new NotFoundError('Corpus not found.')
  }
  if (actor.role === 'admin') {
    return resource
  }
  if (resource.ownerTeamId) {
    await trx.select({ id: team.id }).from(team).where(eq(team.id, resource.ownerTeamId)).for('update')
    const [membership] = await trx.select({ role: teamMembership.role })
      .from(teamMembership)
      .where(and(eq(teamMembership.teamId, resource.ownerTeamId), eq(teamMembership.userId, actor.userId)))
      .limit(1)
    if (membership?.role === 'owner') {
      return resource
    }
  }
  throw new ForbiddenError('Only an administrator or the current owner may manage this corpus.')
}

async function getDocumentCorpusId(documentId: string): Promise<string> {
  const [row] = await db.select({ corpusId: document.corpusId }).from(document).where(eq(document.id, documentId)).limit(1)
  if (!row) {
    throw new NotFoundError()
  }
  return row.corpusId
}

export async function requireViewDocument(documentId: string): Promise<string | null> {
  const corpusId = await getDocumentCorpusId(documentId)
  return requireViewCorpus(corpusId)
}

export async function requireEditDocument(documentId: string): Promise<string> {
  const corpusId = await getDocumentCorpusId(documentId)
  await requireEditCorpus(corpusId)
  return corpusId
}

export async function requireEditCustomEntity(entityId: string): Promise<string> {
  const [row] = await db.select({ corpusId: corpusCustomEntity.corpusId }).from(corpusCustomEntity).where(eq(corpusCustomEntity.id, entityId)).limit(1)
  if (!row) {
    throw new NotFoundError()
  }
  await requireEditCorpus(row.corpusId)
  return row.corpusId
}

export async function requireEditAnnotation(annotationId: string): Promise<{ corpusId: string, documentId: string }> {
  const [row] = await db
    .select({ corpusId: document.corpusId, documentId: document.id })
    .from(annotation)
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(eq(annotation.id, annotationId))
    .limit(1)
  if (!row) {
    throw new NotFoundError()
  }
  await requireEditCorpus(row.corpusId)
  return row
}

export async function canEdit(corpusId: string): Promise<boolean> {
  const access = await getCorpusAccess(corpusId)
  return access === 'editor' || access === 'manager'
}

export async function isAnonymousViewer(): Promise<boolean> {
  return (await getRequestActor()).type === 'anonymous'
}
