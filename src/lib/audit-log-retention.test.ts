import { describe, expect, it } from 'vitest'
import { AUDIT_LOG_RETENTION_DAYS, nextPruneDelay, retentionCutoff } from './audit-log-retention'

const DAY_MS = 24 * 60 * 60 * 1000

describe('retentionCutoff', () => {
  it('subtracts exactly 180 days from the injected now', () => {
    const now = new Date('2026-05-31T12:34:56.789Z')
    expect(now.getTime() - retentionCutoff(now).getTime()).toBe(AUDIT_LOG_RETENTION_DAYS * DAY_MS)
  })

  it('defaults to the current time', () => {
    const before = Date.now()
    const cutoff = retentionCutoff()
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - AUDIT_LOG_RETENTION_DAYS * DAY_MS - 1000)
    expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - AUDIT_LOG_RETENTION_DAYS * DAY_MS + 1000)
  })
})

describe('nextPruneDelay', () => {
  it('targets 03:30 the same day when it is still ahead', () => {
    const now = new Date(2026, 4, 31, 2, 0, 0, 0)
    expect(nextPruneDelay(now)).toBe(90 * 60 * 1000)
  })

  it('keeps a same-day target at 03:29, meeting the 60s floor exactly', () => {
    const now = new Date(2026, 4, 31, 3, 29, 0, 0)
    expect(nextPruneDelay(now)).toBe(60_000)
  })

  it('rolls to tomorrow at 03:30 sharp', () => {
    const now = new Date(2026, 4, 31, 3, 30, 0, 0)
    expect(nextPruneDelay(now)).toBe(DAY_MS)
  })

  it('honours the 60s floor for a boot within the last second before 03:30', () => {
    const now = new Date(2026, 4, 31, 3, 29, 59, 999)
    const delay = nextPruneDelay(now)
    expect(delay).toBeGreaterThanOrEqual(60_000)
    expect(delay).toBeGreaterThan(23 * 60 * 60 * 1000)
  })

  it('schedules the next morning when 03:30 has passed', () => {
    const now = new Date(2026, 4, 31, 23, 0, 0, 0)
    expect(nextPruneDelay(now)).toBe((4 * 60 + 30) * 60 * 1000)
  })
})
