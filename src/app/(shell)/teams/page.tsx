import Link from 'next/link'
import { createTeam, getMyTeams } from '@/actions/team/teamActions'
import { CreateTeamForm } from '@/components/create-team-form'
import { Page, PageHeader } from '@/components/page'
import { requirePageUser } from '@/lib/auth-utils'
import { MAX_OWNED_TEAMS_PER_USER } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const actor = await requirePageUser()
  const teams = await getMyTeams()
  const teamLimitHint = `You can own up to ${MAX_OWNED_TEAMS_PER_USER} teams.`
  return (
    <Page>
      <PageHeader title="Teams" description="Create teams to share and manage corpora together." />
      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Create a team</h2>
        {actor.role !== 'admin' && (
          <p className="mb-4 text-xs text-muted-foreground">{teamLimitHint}</p>
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
          <Link key={item.id} href={`/teams/${item.slug}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-[13px] font-medium">
              {item.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium">{item.name}</p>
                {item.kind === 'personal' && (
                  <span className="inline-flex shrink-0 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Personal</span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                /
                {item.slug}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground capitalize">{item.role}</span>
          </Link>
        ))}
        {!teams.length && <p className="text-sm text-muted-foreground">You are not in any teams yet.</p>}
      </section>
    </Page>
  )
}
