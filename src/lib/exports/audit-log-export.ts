import type { getRecentAuditEvents } from '@/lib/audit-log-query'

export type AuditExportFormat = 'json' | 'csv'

export function resolveAuditExportFormat(value: string | null): AuditExportFormat | null {
  if (value === 'json' || value === 'csv') {
    return value
  }
  return null
}

// OWASP CSV injection mitigation: a cell that Excel would evaluate as a
// formula gets a leading single quote so it opens as plain text.
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/

function escapeCsvField(value: string): string {
  let safe = CSV_FORMULA_PREFIX.test(value) ? `'${value}` : value
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n') || safe.includes('\r')) {
    safe = `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export function serializeAuditLogExport(
  format: AuditExportFormat,
  events: Awaited<ReturnType<typeof getRecentAuditEvents>>,
): { body: string, contentType: string, extension: 'json' | 'csv' } {
  if (format === 'csv') {
    const rows = events.map(event => [
      event.id,
      event.createdAt.toISOString(),
      event.actorUserId ?? '',
      event.action,
      event.targetType,
      event.targetId ?? '',
      JSON.stringify(event.metadata ?? {}),
    ].map(escapeCsvField).join(','))
    return {
      body: ['id,timestamp,actor_user_id,action,target_type,target_id,metadata', ...rows].join('\n'),
      contentType: 'text/csv; charset=utf-8',
      extension: 'csv',
    }
  }

  const exported = events.map(event => ({
    id: event.id,
    actorUserId: event.actorUserId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    metadata: event.metadata,
    createdAt: event.createdAt,
  }))
  return {
    body: JSON.stringify(exported, null, 2),
    contentType: 'application/json',
    extension: 'json',
  }
}
