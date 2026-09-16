import { describe, expect, it } from 'vitest'
import { compareVersions, parseVersion } from './update-check'

describe('parseVersion', () => {
  it('parses a plain three-part version', () => {
    expect(parseVersion('1.2.0')).toEqual({ major: 1, minor: 2, patch: 0 })
  })

  it('parses a v-prefixed version', () => {
    expect(parseVersion('v1.3.0')).toEqual({ major: 1, minor: 3, patch: 0 })
  })

  it('returns null for malformed versions', () => {
    expect(parseVersion('1.2')).toBeNull()
    expect(parseVersion('abc')).toBeNull()
    expect(parseVersion('1.2.0-rc1')).toBeNull()
    expect(parseVersion('')).toBeNull()
  })
})

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('1.2.0', '2.0.0')).toBe(-1)
    expect(compareVersions('1.2.0', '1.3.0')).toBe(-1)
    expect(compareVersions('1.2.0', '1.2.1')).toBe(-1)
    expect(compareVersions('v1.3.0', '1.2.9')).toBe(1)
  })

  it('treats equal versions as equal regardless of prefix', () => {
    expect(compareVersions('v1.2.0', '1.2.0')).toBe(0)
  })

  it('returns 0 when either version is malformed', () => {
    expect(compareVersions('1.2.0', 'nope')).toBe(0)
    expect(compareVersions('nope', '1.2.0')).toBe(0)
  })
})
