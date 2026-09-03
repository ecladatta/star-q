import type { DeletionImpact } from '@/actions/admin/adminActions'

export function formatDeletionImpact(impact: DeletionImpact): string {
  const personal = impact.personalCorpora === 1 ? 'personal corpus' : 'personal corpora'
  const teams = impact.soleOwnedTeams === 1 ? 'sole-owned team' : 'sole-owned teams'
  const teamCorpora = impact.teamCorpora === 1 ? 'team corpus' : 'team corpora'
  return `Deletion removes ${impact.personalCorpora} ${personal}, ${impact.soleOwnedTeams} ${teams}, and ${impact.teamCorpora} ${teamCorpora}.`
}
