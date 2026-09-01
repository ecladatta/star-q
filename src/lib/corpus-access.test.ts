import { describe, expect, it } from 'vitest'
import { resolveCorpusAccess } from './corpus-access-policy'

describe('corpus access policy', () => {
  it('limits anonymous visitors and the deployment key to read-only access', () => {
    expect(resolveCorpusAccess({ actorType: 'anonymous', visibility: 'private' })).toBeNull()
    expect(resolveCorpusAccess({ actorType: 'anonymous', visibility: 'public' })).toBe('viewer')
    expect(resolveCorpusAccess({ actorType: 'admin-read-key', visibility: 'private' })).toBe('viewer')
  })

  it('grants management to administrators and team owners', () => {
    expect(resolveCorpusAccess({ actorType: 'user', visibility: 'private', isAdmin: true })).toBe('manager')
    expect(resolveCorpusAccess({ actorType: 'user', visibility: 'private', owningTeamRole: 'owner' })).toBe('manager')
  })

  it('lets members edit team-owned corpora', () => {
    expect(resolveCorpusAccess({ actorType: 'user', visibility: 'private', owningTeamRole: 'member' })).toBe('editor')
  })

  it('uses the strongest accepted direct or team collaboration role', () => {
    expect(resolveCorpusAccess({
      actorType: 'user',
      visibility: 'private',
      directCollaborationRoles: ['viewer'],
      teamCollaborationRoles: ['editor'],
    })).toBe('editor')
  })
})
