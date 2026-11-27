import { withApiHandler } from '@/lib/api-utils'
import { getAllAuditEvents } from '@/lib/audit-log-query'
import { requireAdmin } from '@/lib/auth-utils'
import { resolveAuditExportFormat, serializeAuditLogExport } from '@/lib/exports/audit-log-export'

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireAdmin()
    const params = new URL(request.url).searchParams
    const format = resolveAuditExportFormat(params.get('format')?.trim().toLowerCase() ?? null)

    if (!format) {
      return Response.json(
        { error: 'Unsupported audit log export format. Use json or csv.' },
        { status: 400 },
      )
    }

    const serialized = serializeAuditLogExport(format, await getAllAuditEvents({
      q: params.get('q') ?? undefined,
      action: params.get('action') ?? undefined,
    }))
    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.${serialized.extension}`

    return new Response(serialized.body, {
      headers: {
        'Content-Type': serialized.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
