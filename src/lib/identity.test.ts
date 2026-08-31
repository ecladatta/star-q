import { describe, expect, it } from 'vitest'
import { authErrorMessage, normalizeTeamSlug, normalizeUsername, slugifyTeamName, validateCorpusCollaboratorRole, validateInvitationResponse, validatePassword, validateTeamRole, validateTeamSlug, validateUsername, validateUserRole } from './identity'

describe('account identity validation', () => {
  it('normalizes and accepts stable usernames and team slugs', () => {
    expect(normalizeUsername('  Alice_Smith ')).toBe('alice_smith')
    expect(validateUsername('Alice-Smith')).toBe('alice-smith')
    expect(normalizeTeamSlug(' Research-Team ')).toBe('research-team')
    expect(validateTeamSlug('Research-Team')).toBe('research-team')
  })

  it('rejects malformed identifiers', () => {
    expect(() => validateUsername('_alice')).toThrow('3-32')
    expect(() => validateTeamSlug('two words')).toThrow('3-48')
  })

  it('enforces the local password length contract', () => {
    expect(validatePassword('a secure password')).toBe('a secure password')
    expect(() => validatePassword('t')).toThrow('between 4 and 128')
  })
})

describe('slugifyTeamName', () => {
  it('slugifies team names', () => {
    expect(slugifyTeamName('Research Team')).toBe('research-team')
    expect(slugifyTeamName('Research  Team!!!')).toBe('research-team')
    expect(slugifyTeamName('Équipe de Recherche')).toBe('equipe-de-recherche')
    expect(slugifyTeamName('--foo--bar-')).toBe('foo-bar')
    expect(slugifyTeamName('A')).toBe('a')
    expect(slugifyTeamName('')).toBe('')
  })
})

describe('authorization input validation', () => {
  it('accepts only supported roles and invitation responses', () => {
    expect(validateUserRole('admin')).toBe('admin')
    expect(validateTeamRole('owner')).toBe('owner')
    expect(validateCorpusCollaboratorRole('editor')).toBe('editor')
    expect(validateInvitationResponse('accepted')).toBe('accepted')
    expect(() => validateUserRole('superadmin')).toThrow('Invalid user role')
    expect(() => validateTeamRole('manager')).toThrow('Invalid team role')
    expect(() => validateCorpusCollaboratorRole('manager')).toThrow('Invalid corpus collaborator role')
    expect(() => validateInvitationResponse('ignored')).toThrow('Invalid invitation response')
  })
})

describe('authErrorMessage', () => {
  it('maps known authjs error codes to friendly messages', () => {
    expect(authErrorMessage('OAuthAccountNotLinked')).toMatch(/already linked to a different account/)
    expect(authErrorMessage('CredentialsSignin')).toBe('Invalid username or password.')
    expect(authErrorMessage('AccessDenied')).toMatch(/may be blocked/)
    expect(authErrorMessage('Configuration')).toMatch(/server configuration/)
    expect(authErrorMessage('Verification')).toMatch(/invalid or has expired/)
    expect(authErrorMessage('CallbackRouteError')).toMatch(/try again/)
  })

  it('accepts an error code array and no error at all', () => {
    expect(authErrorMessage(['OAuthAccountNotLinked'])).toMatch(/already linked to a different account/)
    expect(authErrorMessage(undefined)).toBeNull()
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(authErrorMessage('SomeUnknownError')).toBe('Something went wrong. Please try again.')
  })
})
