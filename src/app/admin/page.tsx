import Link from 'next/link'
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
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Administration</h1>
        <p className="text-sm text-muted-foreground">Global instance operations and support access.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([href, title, description]) => (
          <Link key={href} href={href} className="rounded-md border p-5 hover:bg-muted/50">
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
