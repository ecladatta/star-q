import type { DbExecutor } from '@/db/drizzle'
import type { TeamKind, TeamRole } from '@/db/schema'
import { and, count, eq, ne, notExists, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db/drizzle'
import { team, teamMembership, users } from '@/db/schema'

export async function getTeamRole(teamId: string, userId: string): Promise<TeamRole | null> {
  const [membership] = await db.select({ role: teamMembership.role })
    .from(teamMembership)
    .where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.userId, userId)))
    .limit(1)
  return membership?.role ?? null
}

export async function assertTeamHasActiveOwner(executor: DbExecutor, teamId: string) {
  const [activeOwners] = await executor.select({ count: count() })
    .from(teamMembership)
    .innerJoin(users, eq(users.id, teamMembership.userId))
    .where(and(eq(teamMembership.teamId, teamId), eq(teamMembership.role, 'owner'), eq(users.status, 'active')))
  if ((activeOwners?.count ?? 0) === 0) {
    throw new Error('The target team must have at least one active owner.')
  }
}

export async function getSoleOwnedTeamIds(executor: DbExecutor, userId: string, kind?: TeamKind): Promise<string[]> {
  const otherMembership = alias(teamMembership, 'other_team_membership')
  const otherOwner = alias(users, 'other_team_owner')
  const rows = await executor.select({ teamId: teamMembership.teamId })
    .from(teamMembership)
    .innerJoin(team, eq(team.id, teamMembership.teamId))
    .where(and(
      eq(teamMembership.userId, userId),
      eq(teamMembership.role, 'owner'),
      kind ? eq(team.kind, kind) : undefined,
      notExists(
        executor.select({ value: sql`1` })
          .from(otherMembership)
          .innerJoin(otherOwner, eq(otherOwner.id, otherMembership.userId))
          .where(and(
            eq(otherMembership.teamId, teamMembership.teamId),
            eq(otherMembership.role, 'owner'),
            eq(otherOwner.status, 'active'),
            ne(otherMembership.userId, userId),
          )),
      ),
    ))
    .orderBy(teamMembership.teamId)
  return rows.map(row => row.teamId)
}

export async function hasOtherActiveTeamOwner(executor: DbExecutor, teamId: string, userId: string): Promise<boolean> {
  const [owner] = await executor.select({ value: sql`1` })
    .from(teamMembership)
    .innerJoin(users, eq(users.id, teamMembership.userId))
    .where(and(
      eq(teamMembership.teamId, teamId),
      eq(teamMembership.role, 'owner'),
      eq(users.status, 'active'),
      ne(teamMembership.userId, userId),
    ))
    .limit(1)
  return Boolean(owner)
}
