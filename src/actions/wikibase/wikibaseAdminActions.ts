'use server'

import type { WikibaseInstanceInput } from '@/lib/wikibase'
import { count, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db/drizzle'
import { auditLog, corpus, wikibaseInstances } from '@/db/schema'
import { NotFoundError, requireAdmin } from '@/lib/auth-utils'
import { parseWikibaseInstanceInput } from '@/lib/wikibase'

const WIKIBASE_ADMIN_PATH = '/admin/wikibase'

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
    const created = await db.transaction(async (trx) => {
      const [row] = await trx.insert(wikibaseInstances).values(parsed).returning()
      await trx.insert(auditLog).values({
        actorUserId: actor.userId,
        action: 'admin.wikibase_instance_created',
        targetType: 'wikibase_instance',
        targetId: row.id,
        metadata: parsed,
      })
      return row
    })
    revalidatePath(WIKIBASE_ADMIN_PATH)
    return created
  } catch (error) {
    throw translateUniqueViolation(error)
  }
}

export async function updateWikibaseInstance(id: string, input: WikibaseInstanceInput) {
  const actor = await requireAdmin()
  const parsed = parseWikibaseInstanceInput(input)
  try {
    const updated = await db.transaction(async (trx) => {
      const [previous] = await trx
        .select({ label: wikibaseInstances.label, instanceUrl: wikibaseInstances.instanceUrl, sparqlEndpoint: wikibaseInstances.sparqlEndpoint })
        .from(wikibaseInstances)
        .where(eq(wikibaseInstances.id, id))
        .limit(1)
      if (!previous) {
        throw new NotFoundError('Wikibase instance not found.')
      }
      const [row] = await trx
        .update(wikibaseInstances)
        .set({ ...parsed, updatedAt: new Date() })
        .where(eq(wikibaseInstances.id, id))
        .returning()
      await trx.insert(auditLog).values({
        actorUserId: actor.userId,
        action: 'admin.wikibase_instance_updated',
        targetType: 'wikibase_instance',
        targetId: id,
        metadata: { previous, ...parsed },
      })
      return row
    })
    revalidatePath(WIKIBASE_ADMIN_PATH)
    return updated
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error
    }
    throw translateUniqueViolation(error)
  }
}

export async function setWikibaseInstanceEnabled(id: string, enabled: boolean) {
  const actor = await requireAdmin()
  await db.transaction(async (trx) => {
    const [updated] = await trx
      .update(wikibaseInstances)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(wikibaseInstances.id, id))
      .returning({ id: wikibaseInstances.id, enabled: wikibaseInstances.enabled })
    if (!updated) {
      throw new NotFoundError('Wikibase instance not found.')
    }
    await trx.insert(auditLog).values({
      actorUserId: actor.userId,
      action: enabled ? 'admin.wikibase_instance_enabled' : 'admin.wikibase_instance_disabled',
      targetType: 'wikibase_instance',
      targetId: id,
    })
  })
  revalidatePath(WIKIBASE_ADMIN_PATH)
}

export async function setWikibaseInstanceDefault(id: string) {
  const actor = await requireAdmin()
  await db.transaction(async (trx) => {
    const [row] = await trx
      .select({ enabled: wikibaseInstances.enabled })
      .from(wikibaseInstances)
      .where(eq(wikibaseInstances.id, id))
      .limit(1)
    if (!row) {
      throw new NotFoundError('Wikibase instance not found.')
    }
    if (!row.enabled) {
      throw new Error('Enable this instance before making it the server default.')
    }
    await trx
      .update(wikibaseInstances)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(wikibaseInstances.isDefault, true))
    await trx
      .update(wikibaseInstances)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(wikibaseInstances.id, id))
    await trx.insert(auditLog).values({
      actorUserId: actor.userId,
      action: 'admin.wikibase_instance_default_set',
      targetType: 'wikibase_instance',
      targetId: id,
    })
  })
  revalidatePath(WIKIBASE_ADMIN_PATH)
}

export async function deleteWikibaseInstance(id: string) {
  const actor = await requireAdmin()
  await db.transaction(async (trx) => {
    const [referencing] = await trx
      .select({ count: count() })
      .from(corpus)
      .where(sql`${corpus.settings}->>'wikibaseInstanceId' = ${id}`)
    const references = referencing?.count ?? 0
    if (references > 0) {
      throw new Error(`Cannot delete this Wikibase instance: ${references} ${references === 1 ? 'corpus references' : 'corpora reference'} it. Detach ${references === 1 ? 'it' : 'them'} first.`)
    }
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
  revalidatePath(WIKIBASE_ADMIN_PATH)
}
