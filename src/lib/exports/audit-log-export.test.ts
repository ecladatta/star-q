import type { getRecentAuditEvents } from '@/lib/audit-log-query'
import { describe, expect, it } from 'vitest'
import { parseAuditSearch } from '@/lib/audit-log-query'
import { relativeTime } from '../audit-log-display'
import { resolveAuditExportFormat, serializeAuditLogExport } from './audit-log-export'

type AuditEventRow = Awaited<ReturnType<typeof getRecentAuditEvents>>[number]

function event(overrides: Partial<AuditEventRow> = {}): AuditEventRow {
  return {
    id: 'event-1',
    actorUserId: null,
    actorUsername: null,
    actorImage: null,
    action: 'instance.settings_updated',
    targetType: 'instance',
    targetId: null,
    metadata: {},
    createdAt: new Date('2026-01-15T10:30:00.000Z'),
    ...overrides,
  }
}

describe('resolveAuditExportFormat', () => {
  it('passes json and csv through', () => {
    expect(resolveAuditExportFormat('json')).toBe('json')
    expect(resolveAuditExportFormat('csv')).toBe('csv')
  })

  it('returns null for unknown, empty and missing values', () => {
    expect(resolveAuditExportFormat('yaml')).toBeNull()
    expect(resolveAuditExportFormat('')).toBeNull()
    expect(resolveAuditExportFormat(null)).toBeNull()
  })
})

describe('parseAuditSearch', () => {
  it('returns an empty parse for empty, blank and missing queries', () => {
    expect(parseAuditSearch(undefined)).toEqual({})
    expect(parseAuditSearch(null)).toEqual({})
    expect(parseAuditSearch('')).toEqual({})
    expect(parseAuditSearch('   ')).toEqual({})
  })

  it('collects free-text tokens on whitespace', () => {
    expect(parseAuditSearch('alice')).toEqual({ text: ['alice'] })
    expect(parseAuditSearch('  alice   bob  ')).toEqual({ text: ['alice', 'bob'] })
  })

  it('parses key:value tokens for action, actor and target, lowercasing the key', () => {
    expect(parseAuditSearch('action:team.')).toEqual({ action: 'team.' })
    expect(parseAuditSearch('actor:alice')).toEqual({ actor: 'alice' })
    expect(parseAuditSearch('target:550e8400')).toEqual({ target: '550e8400' })
    expect(parseAuditSearch('ACTION:team ACTOR:alice Target:x')).toEqual({ action: 'team', actor: 'alice', target: 'x' })
  })

  it('keeps the last value for a repeated key', () => {
    expect(parseAuditSearch('action:team action:corpus')).toEqual({ action: 'corpus' })
  })

  it('treats unknown keys, keyless colons and empty values as free text', () => {
    expect(parseAuditSearch('foo:bar')).toEqual({ text: ['foo:bar'] })
    expect(parseAuditSearch(':value')).toEqual({ text: [':value'] })
    expect(parseAuditSearch('action:')).toEqual({ text: ['action:'] })
  })

  it('escapes LIKE wildcards and backslashes in user input', () => {
    expect(parseAuditSearch('action:50%')).toEqual({ action: '50\\%' })
    expect(parseAuditSearch('target:a_b')).toEqual({ target: 'a\\_b' })
    expect(parseAuditSearch('actor:back\\slash')).toEqual({ actor: 'back\\\\slash' })
    expect(parseAuditSearch('100%_done')).toEqual({ text: ['100\\%\\_done'] })
  })

  it('combines key:value and free-text tokens in one query', () => {
    expect(parseAuditSearch('alice action:team. deleted target:42')).toEqual({
      action: 'team.',
      target: '42',
      text: ['alice', 'deleted'],
    })
  })
})

describe('serializeAuditLogExport (csv)', () => {
  it('emits the header and unquoted plain fields', () => {
    const body = serializeAuditLogExport('csv', [event()]).body
    expect(body.split('\n')[0]).toBe('id,timestamp,actor_user_id,action,target_type,target_id,metadata')
    expect(body.split('\n')[1]).toBe('event-1,2026-01-15T10:30:00.000Z,,instance.settings_updated,instance,,{}')
  })

  it('emits empty cells for missing actorUserId and targetId', () => {
    const body = serializeAuditLogExport('csv', [event({ actorUserId: '22222222-2222-2222-2222-222222222222', targetId: 'settings' })]).body
    expect(body.split('\n')[1]).toBe('event-1,2026-01-15T10:30:00.000Z,22222222-2222-2222-2222-222222222222,instance.settings_updated,instance,settings,{}')
  })

  it('quotes fields containing a comma, double quote or newline', () => {
    const body = serializeAuditLogExport('csv', [
      event({ id: 'event-1', action: 'admin.user_created, with comma' }),
      event({ id: 'event-2', action: 'say "hello"' }),
      event({ id: 'event-3', action: 'line1\nline2' }),
    ]).body
    expect(body.split('\n')[1]).toBe('event-1,2026-01-15T10:30:00.000Z,,"admin.user_created, with comma",instance,,{}')
    expect(body.split('\n')[2]).toBe('event-2,2026-01-15T10:30:00.000Z,,"say ""hello""",instance,,{}')
    expect(body.split('\n')[3]).toBe('event-3,2026-01-15T10:30:00.000Z,,"line1')
    expect(body.split('\n')[4]).toBe('line2",instance,,{}')
  })

  it('serializes metadata as JSON in its cell with CSV escaping', () => {
    const body = serializeAuditLogExport('csv', [event({ metadata: { role: 'member', count: 2 } })]).body
    expect(body.split('\n')[1]).toBe('event-1,2026-01-15T10:30:00.000Z,,instance.settings_updated,instance,,"{""role"":""member"",""count"":2}"')
  })

  it('does not leak actor username or image columns', () => {
    const body = serializeAuditLogExport('csv', [event({ actorUsername: 'alice', actorImage: 'https://example.com/a.png' })]).body
    expect(body.split('\n')[1]).toBe('event-1,2026-01-15T10:30:00.000Z,,instance.settings_updated,instance,,{}')
  })
})

describe('serializeAuditLogExport (json)', () => {
  it('parses back to the same events with createdAt as an ISO string', () => {
    const events = [
      event(),
      event({
        id: 'event-2',
        actorUserId: '22222222-2222-2222-2222-222222222222',
        action: 'team.deleted',
        targetType: 'team',
        targetId: 'team-9',
        metadata: { slug: 'lab' },
        createdAt: new Date('2026-02-20T08:00:00.000Z'),
      }),
    ]
    const parsed = JSON.parse(serializeAuditLogExport('json', events).body)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({
      id: 'event-1',
      actorUserId: null,
      action: 'instance.settings_updated',
      targetType: 'instance',
      targetId: null,
      metadata: {},
      createdAt: '2026-01-15T10:30:00.000Z',
    })
    expect(parsed[1]).toEqual({
      id: 'event-2',
      actorUserId: '22222222-2222-2222-2222-222222222222',
      action: 'team.deleted',
      targetType: 'team',
      targetId: 'team-9',
      metadata: { slug: 'lab' },
      createdAt: '2026-02-20T08:00:00.000Z',
    })
  })

  it('strips the joined actor username and image from the export', () => {
    const parsed = JSON.parse(serializeAuditLogExport('json', [event({
      actorUserId: '22222222-2222-2222-2222-222222222222',
      actorUsername: 'alice',
      actorImage: 'https://example.com/a.png',
    })]).body)
    expect(parsed[0]).not.toHaveProperty('actorUsername')
    expect(parsed[0]).not.toHaveProperty('actorImage')
    expect(Object.keys(parsed[0])).toEqual([
      'id',
      'actorUserId',
      'action',
      'targetType',
      'targetId',
      'metadata',
      'createdAt',
    ])
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-06-15T12:00:00.000Z')

  function minutesAgo(minutes: number): Date {
    return new Date(now.getTime() - minutes * 60_000)
  }

  it('says just now below one minute', () => {
    expect(relativeTime(now, now)).toBe('just now')
    expect(relativeTime(minutesAgo(0.5), now)).toBe('just now')
  })

  it('counts minutes, hours and days', () => {
    expect(relativeTime(minutesAgo(1), now)).toBe('1 minute ago')
    expect(relativeTime(minutesAgo(5), now)).toBe('5 minutes ago')
    expect(relativeTime(minutesAgo(60), now)).toBe('1 hour ago')
    expect(relativeTime(minutesAgo(23 * 60), now)).toBe('23 hours ago')
    expect(relativeTime(minutesAgo(24 * 60), now)).toBe('1 day ago')
    expect(relativeTime(minutesAgo(29 * 24 * 60), now)).toBe('29 days ago')
  })

  it('renders the date itself for older events', () => {
    const old = new Date('2020-01-02T03:04:05.000Z')
    expect(relativeTime(old, now)).toBe(old.toLocaleDateString())
  })
})
