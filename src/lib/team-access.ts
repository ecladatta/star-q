import type { TeamRole } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { teamMembership } from '@/db/schema'

export async function getTeamRole(teamId: string, userId: string): Promise<TeamRole | null> {
  const [membership] = await db.select({ role: teamMembership.role })
    .from(teamMembership)
    .where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, userId)))
    .limit(1)
  return membership?.role ?? null
}
