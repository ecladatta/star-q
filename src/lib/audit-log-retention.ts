import { inArray, lt } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { auditLog } from '@/db/schema'

export const AUDIT_LOG_RETENTION_DAYS = 180

const PRUNE_HOUR = 3
const PRUNE_MINUTE = 30
const MIN_PRUNE_DELAY_MS = 60_000

export function retentionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)
}

export function nextPruneDelay(now: Date = new Date()): number {
  const target = new Date(now)
  target.setHours(PRUNE_HOUR, PRUNE_MINUTE, 0, 0)
  if (target.getTime() - now.getTime() < MIN_PRUNE_DELAY_MS) {
    target.setDate(target.getDate() + 1)
  }
  return target.getTime() - now.getTime()
}

export async function pruneExpiredAuditEvents(batchSize = 1000): Promise<number> {
  const cutoff = retentionCutoff()
  let pruned = 0
  for (;;) {
    const { rowCount } = await db.delete(auditLog).where(inArray(
      auditLog.id,
      db.select({ id: auditLog.id }).from(auditLog).where(lt(auditLog.createdAt, cutoff)).limit(batchSize),
    ))
    const deleted = rowCount ?? 0
    pruned += deleted
    if (deleted < batchSize) {
      return pruned
    }
  }
}
