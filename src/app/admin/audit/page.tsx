import { getAdminAuditLog } from '@/actions/admin/adminActions'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const events = await getAdminAuditLog()
  return (
    <main className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Latest 500 security and access events.</p>
      </div>
      <section className="overflow-hidden rounded-md border">
        {events.map(event => (
          <div key={event.id} className="grid gap-1 border-b p-4 text-sm last:border-0 md:grid-cols-[180px_220px_1fr]">
            <time>{event.createdAt.toISOString()}</time>
            <span>{event.action}</span>
            <span>
              {event.targetType}
              {event.targetId ? ` · ${event.targetId}` : ''}
            </span>
          </div>
        ))}
      </section>
    </main>
  )
}
