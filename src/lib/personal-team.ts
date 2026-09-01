import type { DbExecutor } from '@/db/drizzle'
import type { Team } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { auditLog, team, teamMembership, users } from '@/db/schema'

const TEAM_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/

export function personalTeamSlugCandidates(username: string | null, userId: string): string[] {
  const usernameBase = username?.toLowerCase().replaceAll('_', '-') ?? null
  const base = usernameBase && TEAM_SLUG_PATTERN.test(usernameBase)
    ? usernameBase
    : `personal-${userId.slice(0, 8)}`
  const candidates = [base, `${base}-personal`]
  for (let i = 2; i <= 9; i++) {
    candidates.push(`${base}-personal-${i}`)
  }
  return candidates
}

export function personalTeamDisplayName(name: string | null, username: string | null): string {
  return `${name || username || 'Personal'} (personal)`.slice(0, 100)
}

export async function ensurePersonalTeam(executor: DbExecutor, userId: string): Promise<Team> {
  return executor.transaction(async (trx) => {
    await trx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('star-q-personal-team-' || ${userId}))`)
    const [existing] = await trx.select({ teamId: teamMembership.teamId })
      .from(teamMembership)
      .innerJoin(team, eq(team.id, teamMembership.teamId))
      .where(and(eq(teamMembership.userId, userId), eq(team.kind, 'personal')))
      .limit(1)
    if (existing) {
      const [foundTeam] = await trx.select().from(team).where(eq(team.id, existing.teamId)).limit(1)
      if (foundTeam) {
        return foundTeam
      }
    }
    const [user] = await trx.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      throw new Error('User not found.')
    }
    const displayName = personalTeamDisplayName(user.name, user.username)
    for (const slug of personalTeamSlugCandidates(user.username, userId)) {
      const [collision] = await trx.select({ id: team.id }).from(team).where(eq(team.slug, slug)).limit(1)
      if (collision) {
        continue
      }
      let inserted: Team
      try {
        [inserted] = await trx.insert(team).values({
          name: displayName,
          slug,
          kind: 'personal',
          createdByUserId: userId,
        }).returning()
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') {
          throw error
        }
        continue
      }
      await trx.insert(teamMembership).values({ teamId: inserted.id, userId, role: 'owner' })
      await trx.insert(auditLog).values({
        actorUserId: userId,
        action: 'team.personal_created',
        targetType: 'team',
        targetId: inserted.id,
      })
      return inserted
    }
    throw new Error('Unable to allocate a unique personal team slug.')
  })
}
