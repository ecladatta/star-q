import type { SQL } from 'drizzle-orm'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db/drizzle'
import { auditLog, users } from '@/db/schema'
import { AUDIT_ACTION_CATEGORIES } from '@/lib/audit-log-display'

export const AUDIT_LOG_RECENT_LIMIT = 500

export type AuditLogFilters = { q?: string, action?: string }

export type ParsedAuditSearch = { action?: string, actor?: string, target?: string, text?: string[] }

const AUDIT_SEARCH_KEYS = new Set(['action', 'actor', 'target'])

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, char => `\\${char}`)
}

export function parseAuditSearch(q: string | undefined | null): ParsedAuditSearch {
  const parsed: ParsedAuditSearch = {}
  if (!q) {
    return parsed
  }
  for (const token of q.trim().split(/\s+/)) {
    if (!token) {
      continue
    }
    const separator = token.indexOf(':')
    const key = separator === -1 ? '' : token.slice(0, separator).toLowerCase()
    const value = separator === -1 ? '' : token.slice(separator + 1)
    if (separator !== -1 && value && AUDIT_SEARCH_KEYS.has(key)) {
      parsed[key as 'action' | 'actor' | 'target'] = escapeLikePattern(value)
    } else {
      parsed.text = [...parsed.text ?? [], escapeLikePattern(token)]
    }
  }
  return parsed
}

function buildAuditEventQuery(filters: AuditLogFilters) {
  const actorUsers = alias(users, 'actor_users')
  const conditions: SQL[] = []
  const category = filters.action
    ? AUDIT_ACTION_CATEGORIES.find(candidate => candidate.id === filters.action)
    : undefined
  if (category) {
    conditions.push(ilike(auditLog.action, `${category.id}.%`))
  }
  const search = parseAuditSearch(filters.q)
  if (search.action) {
    conditions.push(ilike(auditLog.action, `%${search.action}%`))
  }
  if (search.actor) {
    conditions.push(ilike(actorUsers.username, `%${search.actor}%`))
  }
  if (search.target) {
    conditions.push(ilike(auditLog.targetId, `%${search.target}%`))
  }
  for (const text of search.text ?? []) {
    const textMatch = or(
      ilike(auditLog.action, `%${text}%`),
      ilike(actorUsers.username, `%${text}%`),
      ilike(auditLog.targetId, `%${text}%`),
    )
    if (textMatch) {
      conditions.push(textMatch)
    }
  }
  return db
    .select({
      id: auditLog.id,
      actorUserId: auditLog.actorUserId,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
      actorUsername: actorUsers.username,
      actorImage: actorUsers.image,
    })
    .from(auditLog)
    .leftJoin(actorUsers, eq(actorUsers.id, auditLog.actorUserId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
}

export async function getRecentAuditEvents(filters: AuditLogFilters = {}) {
  return buildAuditEventQuery(filters).limit(AUDIT_LOG_RECENT_LIMIT)
}

export async function getAllAuditEvents(filters: AuditLogFilters = {}) {
  return buildAuditEventQuery(filters)
}
