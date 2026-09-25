import type { SQL } from 'drizzle-orm'
import type { CorpusAccessResource } from './corpus-access'
import type { CorpusListItem } from '@/actions/corpus/corpusActions'
import type { CorpusStatus } from '@/db/schema'
import { PgDialect } from 'drizzle-orm/pg-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyCorpora } from '@/actions/corpus/corpusActions'
import { corpus, corpusCollaboration, teamMembership } from '@/db/schema'
import { getCorpusAccessForActor, requireEditCorpus, resolveCorpusAccessForRow, resolveCorpusRelationAccess } from './corpus-access'

type Relations = { membership?: unknown[], direct?: unknown[], team?: unknown[] }

const state = vi.hoisted(() => ({
  getRequestActor: vi.fn(),
  corpusRows: [] as Array<Record<string, unknown>>,
  relationsByCorpus: {} as Record<string, Relations>,
  conditions: [] as Array<{ table: unknown, joined: boolean, cond: unknown }>,
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    select: vi.fn(() => makeBuilder()),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  ForbiddenError: class ForbiddenError extends Error {},
  NotFoundError: class NotFoundError extends Error {},
  getRequestActor: state.getRequestActor,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const dialect = new PgDialect()

function makeBuilder() {
  let table: unknown
  let joined = false
  const builder: Record<string, (...args: never[]) => unknown> = {}
  builder.from = (t: unknown) => {
    table = t
    return builder
  }
  builder.leftJoin = () => builder
  builder.innerJoin = () => {
    joined = true
    return builder
  }
  builder.where = (cond: unknown) => {
    if (cond !== undefined) {
      state.conditions.push({ table, joined, cond })
    }
    const rows = routeRows(table, joined, cond)
    const promise = Promise.resolve(rows) as Promise<unknown[]> & Record<string, () => unknown>
    promise.limit = () => Promise.resolve(rows)
    promise.groupBy = () => promise
    promise.orderBy = () => promise
    return promise
  }
  return builder
}

function routeRows(table: unknown, joined: boolean, cond: unknown) {
  if (table === corpus) {
    return state.corpusRows
  }
  const { params } = renderCondition(cond)
  if (table === teamMembership) {
    const owned = state.corpusRows.find(row => params.includes(row.ownerTeamId))
    return (owned && state.relationsByCorpus[owned.id as string]?.membership) ?? []
  }
  if (table === corpusCollaboration) {
    const target = state.corpusRows.find(row => params.includes(row.id))
    if (!target) {
      return []
    }
    const relations = state.relationsByCorpus[target.id as string] ?? {}
    return joined ? relations.team ?? [] : relations.direct ?? []
  }
  return []
}

function corpusRow(id: string, partial: Partial<CorpusAccessResource & { status?: CorpusStatus }> = {}): CorpusAccessResource {
  return { id, ownerTeamId: `team-${id}`, visibility: 'private', ...partial }
}

function renderCondition(cond: unknown): { sql: string, params: unknown[] } {
  return dialect.sqlToQuery(cond as SQL)
}

const admin = { type: 'user', userId: 'admin-1', role: 'admin', username: 'admin' } as const
const member = { type: 'user', userId: 'user-1', role: 'user', username: 'user' } as const

beforeEach(() => {
  state.corpusRows = []
  state.relationsByCorpus = {}
  state.conditions = []
  state.getRequestActor.mockReset()
})

describe('full corpus access (authorization)', () => {
  it('keeps manager access for admins even without any relation', async () => {
    state.corpusRows = [corpusRow('c-1')]
    await expect(getCorpusAccessForActor('c-1', admin)).resolves.toBe('manager')
  })

  it('keeps the visibility baseline for regular users and anonymous visitors', async () => {
    state.corpusRows = [corpusRow('c-1', { visibility: 'public' })]
    await expect(getCorpusAccessForActor('c-1', member)).resolves.toBe('viewer')
    await expect(getCorpusAccessForActor('c-1', { type: 'anonymous' })).resolves.toBe('viewer')
  })

  it('resolves from the row the caller already holds, without re-fetching the corpus', async () => {
    await expect(resolveCorpusAccessForRow(corpusRow('c-1'), admin)).resolves.toBe('manager')
    expect(state.conditions.some(c => c.table === corpus)).toBe(false)
  })
})

describe('requireEditCorpus', () => {
  it('lets managers edit an active corpus', async () => {
    state.getRequestActor.mockResolvedValue(admin)
    state.corpusRows = [corpusRow('c-1')]
    await expect(requireEditCorpus('c-1')).resolves.toBeUndefined()
  })

  it('refuses to edit an archived corpus', async () => {
    state.getRequestActor.mockResolvedValue(admin)
    state.corpusRows = [corpusRow('c-1', { status: 'archived' })]
    await expect(requireEditCorpus('c-1')).rejects.toThrow('This corpus is archived and read-only.')
  })
})

describe('relation-only corpus access (listings)', () => {
  it('hides unrelated corpora from admins and regular users, public or private', async () => {
    await expect(resolveCorpusRelationAccess(corpusRow('c-1'), admin)).resolves.toBeNull()
    await expect(resolveCorpusRelationAccess(corpusRow('c-2', { visibility: 'public' }), member)).resolves.toBeNull()
  })

  it('grants management through owning-team membership', async () => {
    const row = corpusRow('c-1')
    state.corpusRows = [row]
    state.relationsByCorpus['c-1'] = { membership: [{ role: 'owner' }] }
    await expect(resolveCorpusRelationAccess(row, admin)).resolves.toBe('manager')
  })

  it('grants editing through an accepted direct collaboration', async () => {
    const row = corpusRow('c-1')
    state.corpusRows = [row]
    state.relationsByCorpus['c-1'] = { direct: [{ role: 'editor' }] }
    await expect(resolveCorpusRelationAccess(row, admin)).resolves.toBe('editor')
  })

  it('resolves nothing for non-user actors', async () => {
    await expect(resolveCorpusRelationAccess(corpusRow('c-1'), { type: 'anonymous' })).resolves.toBeNull()
    expect(state.conditions).toHaveLength(0)
  })

  it('scopes every collaboration query to the corpus, the actor, and accepted invitations', async () => {
    const row = corpusRow('c-1')
    state.corpusRows = [row]
    await resolveCorpusRelationAccess(row, member)

    const collaborations = state.conditions.filter(c => c.table === corpusCollaboration)
    expect(collaborations).toHaveLength(2)
    for (const { cond } of collaborations) {
      const { sql, params } = renderCondition(cond)
      expect(sql).toContain('"corpus_collaboration"."corpus_id"')
      expect(params).toContain('c-1')
      expect(params).toContain('user-1')
      expect(params).toContain('accepted')
    }
    const memberships = state.conditions.filter(c => c.table === teamMembership && !c.joined)
    expect(memberships).toHaveLength(1)
    for (const { cond } of memberships) {
      const { sql, params } = renderCondition(cond)
      expect(sql).toContain('"team_membership"."user_id"')
      expect(params).toContain('user-1')
    }
  })
})

describe('getMyCorpora wiring', () => {
  it('shows an admin only corpora with an owning membership or a collaboration', async () => {
    state.getRequestActor.mockResolvedValue(admin)
    state.corpusRows = [
      corpusRow('c-unrelated'),
      corpusRow('c-owned'),
      corpusRow('c-collab'),
    ]
    state.relationsByCorpus = {
      'c-owned': { membership: [{ role: 'owner' }] },
      'c-collab': { direct: [{ role: 'editor' }] },
    }

    const result = await getMyCorpora() as unknown as CorpusListItem[]
    expect(result.map(row => row.id)).toEqual(['c-owned', 'c-collab'])
  })

  it('drops viewer-only rows, including public corpora with no relation', async () => {
    state.getRequestActor.mockResolvedValue(member)
    state.corpusRows = [
      corpusRow('c-public', { visibility: 'public' }),
      corpusRow('c-viewer-collab'),
    ]
    state.relationsByCorpus = {
      'c-viewer-collab': { direct: [{ role: 'viewer' }] },
    }

    const result = await getMyCorpora() as unknown as CorpusListItem[]
    expect(result).toEqual([])
  })

  it('never queries the corpus table during access resolution', async () => {
    state.getRequestActor.mockResolvedValue(member)
    state.corpusRows = [corpusRow('c-1')]
    await getMyCorpora() as unknown as CorpusListItem[]
    expect(state.conditions.some(c => c.table === corpus)).toBe(false)
  })
})
