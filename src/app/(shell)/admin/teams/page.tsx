import Link from 'next/link'
import { getAdminTeams } from '@/actions/admin/adminActions'
import { AdminTeamActions } from '@/components/admin-team-actions'
import { Page, PageHeader } from '@/components/page'

export const dynamic = 'force-dynamic'
export default async function AdminTeamsPage() {
  const teams = await getAdminTeams()
  return (
    <Page>
      <PageHeader
        title="All teams"
        description={`${teams.length} teams on this instance`}
      />
      <section className="w-full overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Team</th>
              <th className="px-3 py-2 text-left font-medium">Slug</th>
              <th className="px-3 py-2 text-left font-medium">Kind</th>
              <th className="px-3 py-2 text-left font-medium">Created</th>
              <th className="w-14 px-3 py-2 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team.id} className="border-t border-border transition-colors hover:bg-muted/30">
                <td className="px-3 py-2.5 text-[13px]">
                  <Link href={`/teams/${team.slug}`} className="font-medium text-foreground hover:text-accent hover:underline">
                    {team.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 font-mono text-[13px] text-muted-foreground">{team.slug}</td>
                <td className="px-3 py-2.5 text-[13px]">
                  {team.kind === 'personal'
                    ? <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Personal</span>
                    : <span className="text-xs text-muted-foreground capitalize">{team.kind}</span>}
                </td>
                <td className="px-3 py-2.5 text-[13px] text-muted-foreground">{team.createdAt.toLocaleDateString()}</td>
                <td className="px-3 py-1.5 text-right">
                  {team.kind !== 'personal' && (
                    <div className="flex justify-end">
                      <AdminTeamActions team={team} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  )
}
