import Link from 'next/link'
import { Page, PageHeader } from '@/components/page'
import { requireAdmin } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

const sections = [
  ['/admin/users', 'Users', 'Create, edit, block, reset, and delete accounts.'],
  ['/admin/teams', 'Teams', 'Inspect and manage every team.'],
  ['/admin/corpora', 'Corpora', 'Open any corpus with support access.'],
  ['/admin/settings', 'Settings', 'Control signup and sign-in.'],
  ['/admin/audit', 'Audit log', 'Review security and access events.'],
] as const

export default async function AdminPage() {
  await requireAdmin()
  return (
    <Page>
      <PageHeader
        title="Overview"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(([href, title, description]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring/40 hover:bg-muted/30"
          >
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </Page>
  )
}
