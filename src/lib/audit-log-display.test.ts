import { describe, expect, it } from 'vitest'
import { AUDIT_ACTION_CATEGORIES, auditActionCategory, describeAuditEvent } from './audit-log-display'

type SentenceEvent = {
  action: string
  targetType: string
  targetId: string | null
  metadata: Record<string, unknown>
}

function event(overrides: Partial<SentenceEvent> = {}): SentenceEvent {
  return {
    action: 'instance.settings_updated',
    targetType: 'instance',
    targetId: 'settings',
    metadata: {},
    ...overrides,
  }
}

const TARGET_EVENTS: SentenceEvent[] = [
  { action: 'auth.sign_in', targetType: 'user', targetId: 'u1', metadata: { provider: 'github' } },
  { action: 'auth.sign_in', targetType: 'user', targetId: 'u1', metadata: {} },
  { action: 'auth.sign_up', targetType: 'user', targetId: 'u1', metadata: { provider: 'credentials' } },
  { action: 'auth.provider_linked', targetType: 'user', targetId: 'u1', metadata: { provider: 'github' } },
  { action: 'auth.provider_unlinked', targetType: 'user', targetId: 'u1', metadata: { provider: 'github' } },
  { action: 'auth.provider_linked', targetType: 'user', targetId: 'u1', metadata: {} },
  { action: 'auth.password_changed', targetType: 'user', targetId: 'u1', metadata: {} },
  { action: 'auth.onboarding_completed', targetType: 'user', targetId: 'u1', metadata: {} },
  { action: 'user.profile_updated', targetType: 'user', targetId: 'u1', metadata: {} },
  { action: 'team.created', targetType: 'team', targetId: 't1', metadata: {} },
  { action: 'team.created', targetType: 'team', targetId: null, metadata: {} },
  { action: 'team.personal_created', targetType: 'team', targetId: 't1', metadata: {} },
  { action: 'team.invitation_sent', targetType: 'team', targetId: 't1', metadata: { inviteeUserId: 'u2', role: 'member' } },
  { action: 'team.invitation_sent', targetType: 'team', targetId: 't1', metadata: {} },
  { action: 'team.invitation_accepted', targetType: 'team', targetId: 't1', metadata: { invitationId: 'i1' } },
  { action: 'team.invitation_declined', targetType: 'team', targetId: 't1', metadata: { invitationId: 'i1' } },
  { action: 'team.invitation_cancelled', targetType: 'team', targetId: 't1', metadata: { invitationId: 'i1' } },
  { action: 'team.member_role_updated', targetType: 'team', targetId: 't1', metadata: { userId: 'u2', role: 'owner' } },
  { action: 'team.member_role_updated', targetType: 'team', targetId: 't1', metadata: {} },
  { action: 'team.member_removed', targetType: 'team', targetId: 't1', metadata: { userId: 'u2' } },
  { action: 'team.member_removed', targetType: 'team', targetId: 't1', metadata: { userId: 42 } },
  { action: 'team.member_removed', targetType: 'team', targetId: 't1', metadata: {} },
  { action: 'team.member_left', targetType: 'team', targetId: 't1', metadata: {} },
  { action: 'team.deleted', targetType: 'team', targetId: 't1', metadata: {} },
  { action: 'corpus.created', targetType: 'corpus', targetId: 'c1', metadata: { ownerTeamId: 't1' } },
  { action: 'corpus.deleted', targetType: 'corpus', targetId: 'c1', metadata: {} },
  { action: 'corpus.owner_changed', targetType: 'corpus', targetId: 'c1', metadata: { ownerTeamId: 't2' } },
  { action: 'corpus.owner_changed', targetType: 'corpus', targetId: 'c1', metadata: {} },
  { action: 'corpus.visibility_updated', targetType: 'corpus', targetId: 'c1', metadata: { visibility: 'public' } },
  { action: 'corpus.visibility_updated', targetType: 'corpus', targetId: 'c1', metadata: { visibility: 'private' } },
  { action: 'corpus.visibility_updated', targetType: 'corpus', targetId: 'c1', metadata: {} },
  { action: 'corpus.archived', targetType: 'corpus', targetId: 'c1', metadata: { archivedAt: null } },
  { action: 'corpus.unarchived', targetType: 'corpus', targetId: 'c1', metadata: {} },
  { action: 'corpus.user_added', targetType: 'corpus', targetId: 'c1', metadata: { targetUserId: 'u2', role: 'editor' } },
  { action: 'corpus.team_added', targetType: 'corpus', targetId: 'c1', metadata: { targetTeamId: 't2', role: 'viewer' } },
  { action: 'corpus.user_invited', targetType: 'corpus', targetId: 'c1', metadata: { targetUserId: 'u2', role: 'editor' } },
  { action: 'corpus.team_invited', targetType: 'corpus', targetId: 'c1', metadata: { targetTeamId: 't2', role: 'viewer' } },
  { action: 'corpus.collaborator_role_updated', targetType: 'corpus', targetId: 'c1', metadata: { targetUserId: 'u2', role: 'viewer' } },
  { action: 'corpus.collaborator_role_updated', targetType: 'corpus', targetId: 'c1', metadata: { targetTeamId: 't2', role: 'viewer' } },
  { action: 'corpus.collaboration_revoked', targetType: 'corpus', targetId: 'c1', metadata: { collaborationId: 'x1' } },
  { action: 'corpus.collaboration_left', targetType: 'corpus', targetId: 'c1', metadata: { collaborationId: 'x1' } },
  { action: 'corpus.invitation_accepted', targetType: 'corpus', targetId: 'c1', metadata: { invitationId: 'i1' } },
  { action: 'corpus.invitation_declined', targetType: 'corpus', targetId: 'c1', metadata: { invitationId: 'i1' } },
  { action: 'admin.user_created', targetType: 'user', targetId: 'u2', metadata: { role: 'admin' } },
  { action: 'admin.user_updated', targetType: 'user', targetId: 'u2', metadata: { role: 'user' } },
  { action: 'admin.user_blocked', targetType: 'user', targetId: 'u2', metadata: {} },
  { action: 'admin.user_unblocked', targetType: 'user', targetId: 'u2', metadata: {} },
  { action: 'admin.password_reset', targetType: 'user', targetId: 'u2', metadata: {} },
  { action: 'admin.user_deleted', targetType: 'user', targetId: 'u2', metadata: { personalCorpora: 2, soleOwnedTeams: 1, teamCorpora: 3 } },
  { action: 'admin.api_key_created', targetType: 'api_key', targetId: 'k1', metadata: { name: 'ci-key' } },
  { action: 'admin.api_key_created', targetType: 'api_key', targetId: 'k1', metadata: {} },
  { action: 'admin.api_key_deleted', targetType: 'api_key', targetId: 'k1', metadata: {} },
  { action: 'admin.wikibase_instance_created', targetType: 'wikibase_instance', targetId: 'w1', metadata: { label: 'Wiki' } },
  { action: 'admin.wikibase_instance_updated', targetType: 'wikibase_instance', targetId: 'w1', metadata: {} },
  { action: 'admin.wikibase_instance_enabled', targetType: 'wikibase_instance', targetId: 'w1', metadata: {} },
  { action: 'admin.wikibase_instance_disabled', targetType: 'wikibase_instance', targetId: 'w1', metadata: {} },
  { action: 'admin.wikibase_instance_default_set', targetType: 'wikibase_instance', targetId: 'w1', metadata: {} },
  { action: 'admin.wikibase_instance_deleted', targetType: 'wikibase_instance', targetId: 'w1', metadata: { detachedCorpora: 2 } },
  { action: 'instance.settings_updated', targetType: 'instance', targetId: 'settings', metadata: { signinEnabled: false } },
  { action: 'instance.setup_completed', targetType: 'instance', targetId: 'settings', metadata: { provider: 'credentials' } },
]

const EXPECTED_SENTENCES = [
  'Signed in with github',
  'Signed in',
  'Signed up with credentials',
  'Linked github account',
  'Unlinked github account',
  'Linked an account',
  'Changed password',
  'Completed onboarding',
  'Updated profile',
  'Created team t1',
  'Created a team',
  'Created the personal team',
  'Invited u2 to team t1 as member',
  'Sent a team invitation',
  'Accepted the team invitation',
  'Declined the team invitation',
  'Cancelled the team invitation',
  'Changed the role of member u2 in team t1 to owner',
  'Updated a member role in team t1',
  'Removed member u2 from the team',
  'Removed member 42 from the team',
  'Removed a member from the team',
  'Left the team',
  'Deleted the team',
  'Created corpus c1',
  'Deleted corpus c1',
  'Changed the owner of corpus c1 to t2',
  'Changed the owner of corpus c1',
  'Made corpus c1 public',
  'Made corpus c1 private',
  'Updated the visibility of corpus c1',
  'Archived corpus c1',
  'Unarchived corpus c1',
  'Added user u2 to corpus c1 as editor',
  'Added team t2 to corpus c1 as viewer',
  'Invited user u2 to corpus c1 as editor',
  'Invited team t2 to corpus c1 as viewer',
  'Changed the role of u2 on corpus c1 to viewer',
  'Changed the role of t2 on corpus c1 to viewer',
  'Revoked a collaboration on corpus c1',
  'Left the collaboration on corpus c1',
  'Accepted the corpus invitation',
  'Declined the corpus invitation',
  'Created user u2 with role admin',
  'Updated user u2 with role user',
  'Blocked user u2',
  'Unblocked user u2',
  'Reset the password of user u2',
  'Deleted user u2',
  'Created API key ci-key',
  'Created an API key',
  'Deleted an API key',
  'Created Wikibase instance w1',
  'Updated Wikibase instance w1',
  'Enabled Wikibase instance w1',
  'Disabled Wikibase instance w1',
  'Set Wikibase instance w1 as the default',
  'Deleted Wikibase instance w1',
  'Updated the instance settings',
  'Completed the instance setup',
]

describe('audit action categories', () => {
  it('lists the six action prefixes with sentence-case labels', () => {
    expect(AUDIT_ACTION_CATEGORIES.map(category => category.id)).toEqual(['auth', 'user', 'team', 'corpus', 'admin', 'instance'])
    expect(AUDIT_ACTION_CATEGORIES.map(category => category.label)).toEqual([
      'Auth & access',
      'Account',
      'Team',
      'Corpus',
      'Administration',
      'Instance',
    ])
  })
})

describe('auditActionCategory', () => {
  it('returns the prefix before the first dot for known categories', () => {
    for (const category of AUDIT_ACTION_CATEGORIES) {
      expect(auditActionCategory(`${category.id}.something`)).toBe(category.id)
    }
    expect(auditActionCategory('auth.')).toBe('auth')
  })

  it('returns null for unknown prefixes', () => {
    expect(auditActionCategory('account.profile_updated')).toBeNull()
    expect(auditActionCategory('auth_sign_in')).toBeNull()
    expect(auditActionCategory('.sign_in')).toBeNull()
    expect(auditActionCategory('')).toBeNull()
  })
})

describe('describeAuditEvent', () => {
  it('maps every registered action to its sentence', () => {
    expect(TARGET_EVENTS).toHaveLength(EXPECTED_SENTENCES.length)
    TARGET_EVENTS.forEach((candidate, index) => {
      expect(describeAuditEvent(candidate)).toBe(EXPECTED_SENTENCES[index])
    })
  })

  it('covers every action written by the codebase', () => {
    const writtenActions = [
      'auth.sign_in',
      'auth.provider_linked',
      'auth.sign_up',
      'auth.onboarding_completed',
      'auth.password_changed',
      'auth.provider_unlinked',
      'user.profile_updated',
      'instance.setup_completed',
      'instance.settings_updated',
      'team.created',
      'team.personal_created',
      'team.invitation_sent',
      'team.invitation_accepted',
      'team.invitation_declined',
      'team.invitation_cancelled',
      'team.member_role_updated',
      'team.member_removed',
      'team.member_left',
      'team.deleted',
      'corpus.created',
      'corpus.deleted',
      'corpus.owner_changed',
      'corpus.visibility_updated',
      'corpus.archived',
      'corpus.unarchived',
      'corpus.user_added',
      'corpus.team_added',
      'corpus.user_invited',
      'corpus.team_invited',
      'corpus.collaborator_role_updated',
      'corpus.collaboration_revoked',
      'corpus.collaboration_left',
      'corpus.invitation_accepted',
      'corpus.invitation_declined',
      'admin.user_created',
      'admin.user_updated',
      'admin.user_blocked',
      'admin.user_unblocked',
      'admin.password_reset',
      'admin.user_deleted',
      'admin.api_key_created',
      'admin.api_key_deleted',
      'admin.wikibase_instance_created',
      'admin.wikibase_instance_updated',
      'admin.wikibase_instance_enabled',
      'admin.wikibase_instance_disabled',
      'admin.wikibase_instance_default_set',
      'admin.wikibase_instance_deleted',
    ]
    for (const action of writtenActions) {
      expect(describeAuditEvent(event({ action, targetId: 'x' }))).not.toBe(action)
      expect(describeAuditEvent(event({ action, targetId: 'x' }))).not.toMatch(/^Performed /)
    }
  })

  it('falls back to a per-category sentence for unregistered known prefixes', () => {
    expect(describeAuditEvent(event({ action: 'team.future_action' }))).toBe('Performed a team action')
    expect(describeAuditEvent(event({ action: 'corpus.future_action' }))).toBe('Performed a corpus action')
    expect(describeAuditEvent(event({ action: 'auth.future_action' }))).toBe('Performed an authentication action')
    expect(describeAuditEvent(event({ action: 'user.future_action' }))).toBe('Performed an account action')
    expect(describeAuditEvent(event({ action: 'admin.future_action' }))).toBe('Performed an administration action')
    expect(describeAuditEvent(event({ action: 'instance.future_action' }))).toBe('Performed an instance action')
  })

  it('returns the raw action string for unknown prefixes', () => {
    expect(describeAuditEvent(event({ action: 'mystery.thing' }))).toBe('mystery.thing')
  })
})
