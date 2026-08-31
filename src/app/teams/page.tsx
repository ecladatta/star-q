import Link from 'next/link'
import { createTeam, getMyTeams } from '@/actions/team/teamActions'
import { CreateTeamForm } from '@/components/create-team-form'
import { requirePageUser } from '@/lib/auth-utils'
import { MAX_OWNED_TEAMS_PER_USER } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const actor = await requirePageUser()
  const teams = await getMyTeams()
  const teamLimitHint = `You can own up to ${MAX_OWNED_TEAMS_PER_USER} teams.`
  return (
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Teams</h1>
        <p className="text-sm text-muted-foreground">Create teams and collaborate on team-owned corpora.</p>
      </div>
      <section className="rounded-md border p-5">
        <h2 className="mb-4 text-lg font-semibold">Create a team</h2>
        {actor.role !== 'admin' && (
          <p className="mb-4 text-sm text-muted-foreground">{teamLimitHint}</p>
        )}
        <CreateTeamForm
          action={async (formData) => {
            'use server'
            await createTeam(String(formData.get('name')), String(formData.get('slug')))
          }}
        />
      </section>
      <section className="space-y-3">
        {teams.map(item => (
          <Link key={item.id} href={`/teams/${item.slug}`} className="flex items-center justify-between rounded-md border p-4 hover:bg-muted/50">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.slug}</p>
            </div>
            <span className="text-sm capitalize">{item.role}</span>
          </Link>
        ))}
        {!teams.length && <p className="text-sm text-muted-foreground">You are not in any teams yet.</p>}
      </section>
    </main>
  )
}
