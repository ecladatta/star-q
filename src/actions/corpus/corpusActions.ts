'use server'
import type { Column, SQL, SQLWrapper } from 'drizzle-orm'
import type { DbExecutor, DbTransaction } from '@/db/drizzle'
import type { Corpus, CorpusCustomEntity, CorpusVisibility, Document } from '@/db/schema'
import type { AuthenticatedActor, RequestActor } from '@/lib/auth-utils'
import type { CorpusAccess } from '@/lib/corpus-access'
import type { CorpusSettings } from '@/lib/corpus-settings'
import { and, count, countDistinct, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, annotationQualifier, auditLog, corpus, corpusCollaboration, corpusCustomEntity, document, team, teamMembership, users } from '@/db/schema'
import { ForbiddenError, getRequestActor, NotFoundError } from '@/lib/auth-utils'
import { MAX_CORPORA_PER_TEAM, MAX_CUSTOM_ENTITIES_PER_CORPUS, MAX_OWNED_CORPORA_PER_USER } from '@/lib/constants'
import { getCorpusAccessForActor, lockCorpusAndRequireManager, requireEditCorpus, requireEditCustomEntity, requireViewCorpus } from '@/lib/corpus-access'
import { mergeCorpusSettings, sanitizeCorpusSettingsPatch } from '@/lib/corpus-settings'
import { validateCorpusVisibility } from '@/lib/identity'
import { assertTeamHasActiveOwner } from '@/lib/team-access'

export type DocumentMetadata = Omit<Document, 'raw'> & { annotationsCount: number }
export type CorpusOwnerInput = { type: 'user' } | { type: 'team', teamId: string }
type ResolvedCorpusOwner
  = | { ownerType: 'user', ownerUserId: string, ownerTeamId: null }
    | { ownerType: 'team', ownerUserId: null, ownerTeamId: string }
export type CorpusListItem = Corpus & {
  documentsCount: number
  annotationsCount: number
  access: CorpusAccess
  ownerIdentifier: string | null
}

async function resolveCorpusOwner(executor: DbExecutor, actor: AuthenticatedActor, owner: CorpusOwnerInput): Promise<ResolvedCorpusOwner> {
  if (owner.type === 'user') {
    const [targetUser] = await executor.select({ id: users.id }).from(users).where(eq(users.id, actor.userId)).for('update')
    if (!targetUser) {
      throw new NotFoundError('User not found.')
    }
    return { ownerType: 'user' as const, ownerUserId: actor.userId, ownerTeamId: null }
  }

  const [targetTeam] = await executor.select({ id: team.id }).from(team).where(eq(team.id, owner.teamId)).for('update')
  if (!targetTeam) {
    throw new NotFoundError('Team not found.')
  }
  const [membership] = await executor.select({ role: teamMembership.role })
    .from(teamMembership)
    .where(and(eq(teamMembership.teamId, owner.teamId), eq(teamMembership.userId, actor.userId)))
    .limit(1)
  if (membership?.role !== 'owner' && actor.role !== 'admin') {
    throw new ForbiddenError('Only team owners can create a corpus for that team.')
  }
  await assertTeamHasActiveOwner(executor, owner.teamId)
  return { ownerType: 'team' as const, ownerUserId: null, ownerTeamId: owner.teamId }
}

export async function getCorpora(): Promise<CorpusListItem[]> {
  return queryCorpora(await getRequestActor(), null)
}

export async function getMyCorpora(): Promise<CorpusListItem[]> {
  const rows = await queryCorpora(await getRequestActor(), null)
  return rows.filter(row => row.access === 'editor' || row.access === 'manager')
}

export async function getPublicCorpora(): Promise<CorpusListItem[]> {
  return queryCorpora(await getRequestActor(), 'public')
}

async function queryCorpora(actor: RequestActor, visibility: CorpusVisibility | null): Promise<CorpusListItem[]> {
  const rows = await db.select({
    ...getTableColumns(corpus),
    documentsCount: countDistinct(document.id),
    annotationsCount: count(annotation.id),
    ownerIdentifier: sql<string | null>`COALESCE(${users.username}, ${team.slug})`,
  })
    .from(corpus)
    .leftJoin(users, eq(users.id, corpus.ownerUserId))
    .leftJoin(team, eq(team.id, corpus.ownerTeamId))
    .leftJoin(document, eq(document.corpusId, corpus.id))
    .leftJoin(annotation, eq(annotation.documentId, document.id))
    .where(visibility ? eq(corpus.visibility, visibility) : undefined)
    .groupBy(corpus.id, users.username, team.slug)
    .orderBy(desc(corpus.createdAt))

  const withAccess = await Promise.all(rows.map(async row => ({
    ...row,
    access: await getCorpusAccessForActor(row.id, actor),
  })))
  return withAccess.filter((row): row is typeof row & { access: CorpusAccess } => row.access !== null)
}

async function assertWithinCorpusLimit(
  executor: DbExecutor,
  actor: AuthenticatedActor,
  owner: ResolvedCorpusOwner,
) {
  if (actor.role === 'admin') {
    return
  }
  if (owner.ownerType === 'user' && owner.ownerUserId) {
    const [row] = await executor.select({ count: count() })
      .from(corpus)
      .where(and(eq(corpus.ownerType, 'user'), eq(corpus.ownerUserId, owner.ownerUserId)))
    if ((row?.count ?? 0) >= MAX_OWNED_CORPORA_PER_USER) {
      throw new Error(`You can own at most ${MAX_OWNED_CORPORA_PER_USER} corpora.`)
    }
    return
  }
  if (owner.ownerType === 'team' && owner.ownerTeamId) {
    const [row] = await executor.select({ count: count() })
      .from(corpus)
      .where(and(eq(corpus.ownerType, 'team'), eq(corpus.ownerTeamId, owner.ownerTeamId)))
    if ((row?.count ?? 0) >= MAX_CORPORA_PER_TEAM) {
      throw new Error(`This team can own at most ${MAX_CORPORA_PER_TEAM} corpora.`)
    }
  }
}

async function applyCorpusOwnershipChange(
  trx: DbTransaction,
  corpusId: string,
  resource: Pick<Corpus, 'ownerType' | 'ownerUserId' | 'ownerTeamId'>,
  nextOwner: ResolvedCorpusOwner,
  actor: AuthenticatedActor,
) {
  await assertWithinCorpusLimit(trx, actor, nextOwner)
  await trx.update(corpus).set({ ...nextOwner, updatedAt: new Date() }).where(eq(corpus.id, corpusId))

  if (nextOwner.ownerType === 'user') {
    await trx.delete(corpusCollaboration).where(and(
      eq(corpusCollaboration.corpusId, corpusId),
      eq(corpusCollaboration.targetUserId, nextOwner.ownerUserId),
    ))
  } else {
    await trx.delete(corpusCollaboration).where(and(
      eq(corpusCollaboration.corpusId, corpusId),
      eq(corpusCollaboration.targetTeamId, nextOwner.ownerTeamId),
    ))
  }

  await trx.insert(auditLog).values({
    actorUserId: actor.userId,
    action: 'corpus.owner_changed',
    targetType: 'corpus',
    targetId: corpusId,
    metadata: {
      previousOwnerType: resource.ownerType,
      previousOwnerUserId: resource.ownerUserId,
      previousOwnerTeamId: resource.ownerTeamId,
      ownerType: nextOwner.ownerType,
      ownerUserId: nextOwner.ownerUserId,
      ownerTeamId: nextOwner.ownerTeamId,
    },
  })
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function moveCorpusToTeam(corpusId: string, targetTeamId: string) {
  const actor = await getRequestActor()
  if (actor.type !== 'user') {
    throw new ForbiddenError()
  }
  if (!UUID_PATTERN.test(targetTeamId)) {
    throw new Error('Invalid team id.')
  }
  await db.transaction(async (trx) => {
    const resource = await lockCorpusAndRequireManager(trx, corpusId, actor)
    const [targetTeam] = await trx.select().from(team).where(eq(team.id, targetTeamId)).for('update')
    if (!targetTeam) {
      throw new NotFoundError('Team not found.')
    }
    if (actor.role !== 'admin') {
      const [membership] = await trx.select({ role: teamMembership.role })
        .from(teamMembership)
        .where(and(eq(teamMembership.teamId, targetTeamId), eq(teamMembership.userId, actor.userId)))
        .limit(1)
      if (membership?.role !== 'owner') {
        throw new ForbiddenError('You can only move a corpus into a team you own.')
      }
    }
    if (resource.ownerTeamId === targetTeamId) {
      throw new Error('That team already owns this corpus.')
    }
    await assertTeamHasActiveOwner(trx, targetTeamId)
    const [row] = await trx.select({ count: count() })
      .from(corpus)
      .where(and(eq(corpus.ownerType, 'team'), eq(corpus.ownerTeamId, targetTeamId)))
    if ((row?.count ?? 0) >= MAX_CORPORA_PER_TEAM) {
      throw new Error(`This team can own at most ${MAX_CORPORA_PER_TEAM} corpora.`)
    }
    await applyCorpusOwnershipChange(trx, corpusId, resource, { ownerType: 'team', ownerUserId: null, ownerTeamId: targetTeamId }, actor)
  })
  revalidatePath('/')
  revalidatePath('/admin/corpora')
  revalidatePath(`/corpus/${corpusId}`)
  revalidatePath(`/corpus/${corpusId}/settings`)
}

export async function getMoveTargets(): Promise<Array<{ id: string, name: string, slug: string }>> {
  const actor = await getRequestActor()
  if (actor.type !== 'user') {
    return []
  }
  if (actor.role === 'admin') {
    return db.select({ id: team.id, name: team.name, slug: team.slug }).from(team).orderBy(team.name)
  }
  return db.select({ id: team.id, name: team.name, slug: team.slug })
    .from(team)
    .innerJoin(teamMembership, eq(teamMembership.teamId, team.id))
    .where(and(eq(teamMembership.userId, actor.userId), eq(teamMembership.role, 'owner')))
    .orderBy(team.name)
}

export async function addCorpus(title: string, owner: CorpusOwnerInput) {
  const actor = await getRequestActor()
  if (actor.type !== 'user')
    throw new ForbiddenError()
  const result = await db.transaction(async (trx) => {
    const resolvedOwner = await resolveCorpusOwner(trx, actor, owner)
    await assertWithinCorpusLimit(trx, actor, resolvedOwner)
    const [created] = await trx.insert(corpus).values({ title, ...resolvedOwner }).returning({ id: corpus.id })
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.created', targetType: 'corpus', targetId: created.id, metadata: { ownerType: resolvedOwner.ownerType, ownerTeamId: resolvedOwner.ownerTeamId } })
    return created
  })
  revalidatePath('/')
  return result
}

export async function deleteCorpus(id: string) {
  const actor = await getRequestActor()
  if (actor.type !== 'user')
    throw new ForbiddenError()
  await db.transaction(async (trx) => {
    await lockCorpusAndRequireManager(trx, id, actor)
    await trx.delete(corpus).where(eq(corpus.id, id))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.deleted', targetType: 'corpus', targetId: id })
  })
  revalidatePath('/')
}

export async function getCorpus(id: string): Promise<Corpus> {
  await requireViewCorpus(id)

  const [data] = await db.select().from(corpus).where(eq(corpus.id, id))
  return data
}

export async function getCorpusOwner(id: string): Promise<{ name: string | null, identifier: string | null }> {
  await requireViewCorpus(id)

  const [row] = await db
    .select({
      name: sql<string | null>`COALESCE(${users.name}, ${team.name})`,
      identifier: sql<string | null>`COALESCE(${users.username}, ${team.slug})`,
    })
    .from(corpus)
    .leftJoin(users, eq(users.id, corpus.ownerUserId))
    .leftJoin(team, eq(team.id, corpus.ownerTeamId))
    .where(eq(corpus.id, id))

  return row ?? { name: null, identifier: null }
}

export async function getCorpusAnnotationsCount(corpusId: string): Promise<number> {
  await requireViewCorpus(corpusId)

  const [result] = await db
    .select({ count: count(annotation.id) })
    .from(annotation)
    .innerJoin(document, eq(annotation.documentId, document.id))
    .where(eq(document.corpusId, corpusId))

  return result?.count || 0
}

export async function duplicateCorpus(id: string, owner: CorpusOwnerInput, newTitle?: string) {
  await requireViewCorpus(id)
  const actor = await getRequestActor()
  if (actor.type !== 'user')
    throw new ForbiddenError()

  const newCorpus = await db.transaction(async (trx) => {
    const resolvedOwner = await resolveCorpusOwner(trx, actor, owner)
    const [originalCorpus] = await trx.select().from(corpus).where(eq(corpus.id, id))
    if (!originalCorpus) {
      throw new Error('Corpus not found')
    }
    await assertWithinCorpusLimit(trx, actor, resolvedOwner)

    const title = newTitle || `${originalCorpus.title} (copy)`
    const [newCorpus] = await trx.insert(corpus).values({
      title,
      settings: originalCorpus.settings,
      visibility: originalCorpus.visibility,
      ...resolvedOwner,
    }).returning()

    // Copy custom entities first and create mapping
    const customEntities = await trx.select().from(corpusCustomEntity).where(eq(corpusCustomEntity.corpusId, id))
    const customEntityIdMap = new Map<string, string>()

    if (customEntities.length > 0) {
      const newCustomEntities = await trx.insert(corpusCustomEntity)
        .values(
          customEntities.map(entity => ({
            corpusId: newCorpus.id,
            label: entity.label,
            value: entity.value,
            datatype: entity.datatype,
            customType: entity.customType,
          })),
        )
        .returning()

      // Create mapping of old custom entity IDs to new custom entity IDs
      customEntities.forEach((oldEntity, index) => {
        customEntityIdMap.set(oldEntity.id, newCustomEntities[index].id)
      })
    }

    const documents = await trx.select().from(document).where(eq(document.corpusId, id)).orderBy(document.order)

    // Create a mapping from old document IDs to new document IDs to link annotations
    const documentIdMap = new Map<string, string>()

    if (documents.length > 0) {
      const BATCH_SIZE = 500
      const documentBatches = []

      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        documentBatches.push(documents.slice(i, i + BATCH_SIZE))
      }

      for (const batch of documentBatches) {
        const newDocuments = await trx.insert(document)
          .values(
            batch.map(doc => ({
              corpusId: newCorpus.id,
              title: doc.title,
              raw: doc.raw,
              order: doc.order,
            })),
          )
          .returning()

        // Create mapping of old document IDs to new document IDs
        batch.forEach((oldDoc, index) => {
          documentIdMap.set(oldDoc.id, newDocuments[index].id)
        })
      }
    }

    if (documentIdMap.size > 0) {
      // Get all annotations for the documents in the original corpus
      const oldDocIds = Array.from(documentIdMap.keys())
      const annotations = await trx.select()
        .from(annotation)
        .where(inArray(annotation.documentId, oldDocIds))
      const oldAnnotationIds = annotations.map(anno => anno.id)
      const qualifiers = oldAnnotationIds.length > 0
        ? await trx.select().from(annotationQualifier).where(inArray(annotationQualifier.annotationId, oldAnnotationIds))
        : []

      if (annotations.length > 0) {
        // Get all annotation components that are referenced by these annotations
        const componentIds = Array.from(new Set([
          ...annotations.map(anno => anno.subjectId),
          ...annotations.map(anno => anno.predicateId),
          ...annotations.map(anno => anno.objectId),
          ...qualifiers.map(qualifier => qualifier.predicateId),
          ...qualifiers.map(qualifier => qualifier.valueId),
        ]))

        const components = await trx.select()
          .from(annotationComponent)
          .where(inArray(annotationComponent.id, componentIds))

        // Create new annotation components with updated custom entity IDs
        const componentIdMap = new Map<string, string>()

        if (components.length > 0) {
          const BATCH_SIZE = 500
          const componentBatches = []

          for (let i = 0; i < components.length; i += BATCH_SIZE) {
            componentBatches.push(components.slice(i, i + BATCH_SIZE))
          }

          for (const batch of componentBatches) {
            const newComponents = await trx.insert(annotationComponent)
              .values(
                batch.map((comp) => {
                  // Map old custom entity ID to new custom entity ID
                  let mappedEntityCustomId: string | null = null
                  if (comp.entityCustomId) {
                    mappedEntityCustomId = customEntityIdMap.get(comp.entityCustomId) ?? null
                  }

                  return {
                    entityLabel: comp.entityLabel,
                    entityValue: comp.entityValue,
                    entityCustom: comp.entityCustom,
                    entityCustomId: mappedEntityCustomId,
                    entityDatatype: comp.entityDatatype,
                    annotationStart: comp.annotationStart,
                    annotationEnd: comp.annotationEnd,
                    annotationRow: comp.annotationRow,
                    annotationCell: comp.annotationCell,
                    annotationValue: comp.annotationValue,
                    annotationType: comp.annotationType,
                    annotationTag: comp.annotationTag,
                    elementIndex: comp.elementIndex,
                  }
                }),
              )
              .returning()

            // Create mapping of old component IDs to new component IDs
            batch.forEach((oldComponent, index) => {
              componentIdMap.set(oldComponent.id, newComponents[index].id)
            })
          }
        }

        // Insert annotations with updated document IDs and component IDs
        if (annotations.length > 0) {
          const BATCH_SIZE = 500
          const annotationBatches = []
          const annotationIdMap = new Map<string, string>()

          for (let i = 0; i < annotations.length; i += BATCH_SIZE) {
            annotationBatches.push(annotations.slice(i, i + BATCH_SIZE))
          }

          for (const batch of annotationBatches) {
            const newAnnotations = await trx.insert(annotation)
              .values(
                batch.map(anno => ({
                  documentId: documentIdMap.get(anno.documentId)!,
                  subjectId: componentIdMap.get(anno.subjectId)!,
                  predicateId: componentIdMap.get(anno.predicateId)!,
                  objectId: componentIdMap.get(anno.objectId)!,
                  userId: anno.userId,
                  createdAt: anno.createdAt,
                  updatedAt: anno.updatedAt,
                })),
              )
              .returning({ id: annotation.id })

            batch.forEach((oldAnnotation, index) => {
              annotationIdMap.set(oldAnnotation.id, newAnnotations[index].id)
            })
          }

          if (qualifiers.length > 0) {
            const qualifierBatches = []

            for (let i = 0; i < qualifiers.length; i += BATCH_SIZE) {
              qualifierBatches.push(qualifiers.slice(i, i + BATCH_SIZE))
            }

            for (const batch of qualifierBatches) {
              await trx.insert(annotationQualifier).values(
                batch.map(qualifier => ({
                  annotationId: annotationIdMap.get(qualifier.annotationId)!,
                  predicateId: componentIdMap.get(qualifier.predicateId)!,
                  valueId: componentIdMap.get(qualifier.valueId)!,
                  position: qualifier.position,
                  createdAt: qualifier.createdAt,
                  updatedAt: qualifier.updatedAt,
                })),
              )
            }
          }
        }
      }
    }

    return newCorpus
  })

  revalidatePath('/')
  return newCorpus
}

export async function renameCorpus(id: string, newTitle: string) {
  const actor = await getRequestActor()
  if (actor.type !== 'user')
    throw new ForbiddenError()
  await db.transaction(async (trx) => {
    await lockCorpusAndRequireManager(trx, id, actor)
    await trx.update(corpus).set({ title: newTitle, updatedAt: new Date() }).where(eq(corpus.id, id))
  })
  revalidatePath('/')
}

export async function updateCorpusSettings(corpusId: string, patch: Partial<CorpusSettings>) {
  await requireEditCorpus(corpusId)

  const [existing] = await db
    .select({ settings: corpus.settings })
    .from(corpus)
    .where(eq(corpus.id, corpusId))
  if (!existing) {
    throw new Error('Corpus not found')
  }

  const settings = mergeCorpusSettings(existing.settings, sanitizeCorpusSettingsPatch(patch))
  await db
    .update(corpus)
    .set({ settings, updatedAt: new Date() })
    .where(eq(corpus.id, corpusId))
  revalidatePath(`/corpus/${corpusId}`)
}

export async function updateCorpusVisibility(corpusId: string, visibility: CorpusVisibility) {
  visibility = validateCorpusVisibility(visibility)
  const actor = await getRequestActor()
  if (actor.type !== 'user')
    throw new ForbiddenError()

  await db.transaction(async (trx) => {
    const resource = await lockCorpusAndRequireManager(trx, corpusId, actor)
    if (resource.visibility === visibility) {
      return
    }
    await trx.update(corpus).set({ visibility, updatedAt: new Date() }).where(eq(corpus.id, corpusId))
    await trx.insert(auditLog).values({ actorUserId: actor.userId, action: 'corpus.visibility_updated', targetType: 'corpus', targetId: corpusId, metadata: { visibility } })
  })
  revalidatePath(`/corpus/${corpusId}`)
  revalidatePath('/')
}

export async function getCorpusCustomEntities(corpusId: string): Promise<CorpusCustomEntity[]> {
  await requireViewCorpus(corpusId)

  return db.select().from(corpusCustomEntity).where(eq(corpusCustomEntity.corpusId, corpusId))
}

export async function addCorpusCustomEntity(corpusId: string, label: string, value: string, datatype: string, customType: 'entity' | 'relation') {
  await requireEditCorpus(corpusId)

  const [existing] = await db.select({ count: count() }).from(corpusCustomEntity).where(eq(corpusCustomEntity.corpusId, corpusId))
  if ((existing?.count ?? 0) >= MAX_CUSTOM_ENTITIES_PER_CORPUS) {
    throw new Error(`A corpus can have at most ${MAX_CUSTOM_ENTITIES_PER_CORPUS} custom entities.`)
  }

  const [result] = await db.insert(corpusCustomEntity).values({
    corpusId,
    label,
    value,
    datatype: datatype as any,
    customType,
  }).returning({ id: corpusCustomEntity.id })
  revalidatePath(`/corpus/${corpusId}`)
  return result.id
}

export async function updateCorpusCustomEntity(id: string, label: string, value: string, datatype: string, customType: 'entity' | 'relation') {
  const corpusId = await requireEditCustomEntity(id)

  await db.update(corpusCustomEntity).set({
    label,
    value,
    datatype: datatype as any,
    customType,
    updatedAt: new Date(),
  }).where(eq(corpusCustomEntity.id, id))
  revalidatePath(`/corpus/${corpusId}`)
}

export async function deleteCorpusCustomEntity(id: string) {
  const corpusId = await requireEditCustomEntity(id)

  await db.delete(corpusCustomEntity).where(eq(corpusCustomEntity.id, id))
  revalidatePath(`/corpus/${corpusId}`)
}

function levenshtein(
  source: Column,
  text: string | SQLWrapper,
  insCost = 1,
  delCost = 1,
  subCost = 1,
): SQL {
  return sql`levenshtein(${source}, ${text}, ${insCost}, ${delCost}, ${subCost})`
}

export async function searchCorpusCustomEntities(corpusId: string, searchTerm: string, entityType: 'subject' | 'predicate' | 'object') {
  await requireViewCorpus(corpusId)

  // Map entityType to customType
  const customType: 'entity' | 'relation' = entityType === 'predicate' ? 'relation' : 'entity'

  const searchPattern = `%${searchTerm}%`

  return db.select()
    .from(corpusCustomEntity)
    .where(
      and(
        eq(corpusCustomEntity.corpusId, corpusId),
        eq(corpusCustomEntity.customType, customType),
        sql`(${corpusCustomEntity.label} ILIKE ${searchPattern} OR ${corpusCustomEntity.value} ILIKE ${searchPattern})`,
      ),
    )
    .orderBy(
      levenshtein(corpusCustomEntity.label, searchTerm),
      levenshtein(corpusCustomEntity.value, searchTerm),
    )
    .limit(10)
}
