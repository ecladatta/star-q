'use server'

import { createHash, randomBytes } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db/drizzle'
import { apiKey, auditLog } from '@/db/schema'
import { NotFoundError, requireAdmin } from '@/lib/auth-utils'
import { validateDisplayName } from '@/lib/identity'

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

export async function getAdminApiKeys() {
  await requireAdmin()
  return db.select({
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    lastUsedAt: apiKey.lastUsedAt,
    createdAt: apiKey.createdAt,
  }).from(apiKey).orderBy(desc(apiKey.createdAt))
}

export async function createAdminApiKey(input: { name: string }): Promise<{ id: string, rawKey: string }> {
  const actor = await requireAdmin()
  const name = validateDisplayName(input.name)
  const rawKey = `sk_${randomBytes(32).toString('hex')}`
  const [created] = await db.insert(apiKey).values({
    name,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, 11),
    createdByUserId: actor.userId,
  }).returning({ id: apiKey.id })
  await db.insert(auditLog).values({ actorUserId: actor.userId, action: 'admin.api_key_created', targetType: 'api_key', targetId: created.id, metadata: { name } })
  revalidatePath('/admin/api-keys')
  return { id: created.id, rawKey }
}

export async function deleteAdminApiKey(apiKeyId: string) {
  const actor = await requireAdmin()
  const deleted = await db.delete(apiKey).where(eq(apiKey.id, apiKeyId)).returning({ id: apiKey.id })
  if (!deleted.length) {
    throw new NotFoundError('API key not found.')
  }
  await db.insert(auditLog).values({ actorUserId: actor.userId, action: 'admin.api_key_deleted', targetType: 'api_key', targetId: apiKeyId })
  revalidatePath('/admin/api-keys')
}
