import Link from 'next/link'
import { getAdminTeams } from '@/actions/admin/adminActions'

export const dynamic = 'force-dynamic'
export default async function AdminTeamsPage() {
  const teams = await getAdminTeams()
  return (
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-semibold">All teams</h1>
      <section className="rounded-md border">
        {teams.map(item => (
          <Link key={item.id} href={`/teams/${item.slug}`} className="block border-b p-4 last:border-0 hover:bg-muted/50">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.slug}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
