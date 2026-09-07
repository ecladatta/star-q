'use server'

import type { WikibaseInstanceInput } from '@/lib/wikibase'
import { count, eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { auditLog, corpus, wikibaseInstances } from '@/db/schema'
import { NotFoundError, requireAdmin } from '@/lib/auth-utils'
import { parseWikibaseInstanceInput } from '@/lib/wikibase'

const UNIQUE_VIOLATION_CODE = '23505'

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION_CODE
}

function translateUniqueViolation(error: unknown): unknown {
  if (!isUniqueViolation(error)) {
    return error
  }
  return new Error('A Wikibase instance with this instance URL already exists.')
}

export async function listWikibaseInstances() {
  await requireAdmin()
  return db.select().from(wikibaseInstances).orderBy(wikibaseInstances.label)
}

export async function createWikibaseInstance(input: WikibaseInstanceInput) {
  const actor = await requireAdmin()
  const parsed = parseWikibaseInstanceInput(input)
  try {
    return await db.transaction(async (trx) => {
      const [created] = await trx.insert(wikibaseInstances).values(parsed).returning()
      await trx.insert(auditLog).values({
        actorUserId: actor.userId,
        action: 'admin.wikibase_instance_created',
        targetType: 'wikibase_instance',
        targetId: created.id,
        metadata: parsed,
      })
      return created
    })
  } catch (error) {
    throw translateUniqueViolation(error)
  }
}

export async function updateWikibaseInstance(id: string, input: WikibaseInstanceInput) {
  const actor = await requireAdmin()
  const parsed = parseWikibaseInstanceInput(input)
  try {
    return await db.transaction(async (trx) => {
      const [updated] = await trx
        .update(wikibaseInstances)
        .set({ ...parsed, updatedAt: new Date() })
        .where(eq(wikibaseInstances.id, id))
        .returning()
      if (!updated) {
        throw new NotFoundError('Wikibase instance not found.')
      }
      await trx.insert(auditLog).values({
        actorUserId: actor.userId,
        action: 'admin.wikibase_instance_updated',
        targetType: 'wikibase_instance',
        targetId: id,
        metadata: parsed,
      })
      return updated
    })
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error
    }
    throw translateUniqueViolation(error)
  }
}

export async function deleteWikibaseInstance(id: string) {
  const actor = await requireAdmin()
  const [referencing] = await db
    .select({ count: count() })
    .from(corpus)
    .where(sql`${corpus.settings}->>'wikibaseInstanceId' = ${id}`)
  const references = referencing?.count ?? 0
  if (references > 0) {
    throw new Error(`Cannot delete this Wikibase instance: ${references} ${references === 1 ? 'corpus references' : 'corpora reference'} it. Detach ${references === 1 ? 'it' : 'them'} first.`)
  }
  await db.transaction(async (trx) => {
    const [deleted] = await trx
      .delete(wikibaseInstances)
      .where(eq(wikibaseInstances.id, id))
      .returning({ id: wikibaseInstances.id })
    if (!deleted) {
      throw new NotFoundError('Wikibase instance not found.')
    }
    await trx.insert(auditLog).values({
      actorUserId: actor.userId,
      action: 'admin.wikibase_instance_deleted',
      targetType: 'wikibase_instance',
      targetId: id,
    })
  })
}
