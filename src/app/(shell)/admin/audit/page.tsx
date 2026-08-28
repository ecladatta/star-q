import { getAdminAuditLog } from '@/actions/admin/adminActions'
import { Page, PageHeader } from '@/components/page'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const events = await getAdminAuditLog()
  return (
    <Page>
      <PageHeader
        title="Audit log"
        description="Latest 500 security and access events."
      />
      <section className="w-full overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Time</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
              <th className="px-3 py-2 text-left font-medium">Target</th>
              <th className="px-3 py-2 text-left font-medium">Actor</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id} className="border-t border-border transition-colors hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground">{event.createdAt.toISOString()}</td>
                <td className="px-3 py-2.5 text-[13px]">{event.action}</td>
                <td className="px-3 py-2.5 text-[13px] text-muted-foreground">
                  {event.targetType}
                  {event.targetId ? ` · ${event.targetId}` : ''}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{event.actorUserId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  )
}
