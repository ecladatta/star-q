import { describe, expect, it } from 'vitest'
import { personalTeamDisplayName, personalTeamSlugCandidates } from './personal-team'

const USER_ID = '0f8fad5bd9cb46911fe4f4b5e1a8d6e9'

describe('personalTeamSlugCandidates', () => {
  it('uses the username when it forms a valid slug', () => {
    expect(personalTeamSlugCandidates('alice', USER_ID)[0]).toBe('alice')
  })

  it('replaces underscores with hyphens', () => {
    expect(personalTeamSlugCandidates('alice_smith', USER_ID)[0]).toBe('alice-smith')
  })

  it('falls back to a personal-id base when the username is too short', () => {
    expect(personalTeamSlugCandidates('ab', USER_ID)[0]).toBe(`personal-${USER_ID.slice(0, 8)}`)
  })

  it('falls back to a personal-id base for a null username', () => {
    expect(personalTeamSlugCandidates(null, USER_ID)[0]).toBe(`personal-${USER_ID.slice(0, 8)}`)
  })

  it('orders base, personal suffix, and numbered retries', () => {
    expect(personalTeamSlugCandidates('alice', USER_ID)).toEqual([
      'alice',
      'alice-personal',
      'alice-personal-2',
      'alice-personal-3',
      'alice-personal-4',
      'alice-personal-5',
      'alice-personal-6',
      'alice-personal-7',
      'alice-personal-8',
      'alice-personal-9',
    ])
  })
})

describe('personalTeamDisplayName', () => {
  it('prefers the display name', () => {
    expect(personalTeamDisplayName('Alice', 'alice')).toBe('Alice (personal)')
  })

  it('falls back to the username', () => {
    expect(personalTeamDisplayName(null, 'alice')).toBe('alice (personal)')
  })

  it('falls back to Personal', () => {
    expect(personalTeamDisplayName(null, null)).toBe('Personal (personal)')
  })

  it('truncates to 100 characters', () => {
    expect(personalTeamDisplayName('x'.repeat(100), 'alice')).toBe('x'.repeat(100))
    expect(personalTeamDisplayName('y'.repeat(95), 'alice').length).toBe(100)
  })
})
