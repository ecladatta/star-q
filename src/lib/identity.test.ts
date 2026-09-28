import { describe, expect, it } from 'vitest'
import { authErrorMessage, isUniqueViolation, isUsernameTakenError, normalizeTeamSlug, normalizeUsername, slugifyTeamName, UsernameTakenError, validateCorpusCollaboratorRole, validateInvitationResponse, validatePassword, validateTeamRole, validateTeamSlug, validateUsername, validateUserRole, withUsernameTakenError } from './identity'

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

function pgUniqueViolation(constraint: string, key: string) {
  return Object.assign(
    new Error(`duplicate key value violates unique constraint "${constraint}"`),
    { code: '23505', constraint, detail: `Key (${key}) already exists.` },
  )
}

function drizzleQueryError(cause: unknown) {
  return Object.assign(new Error(`Failed query: update "user" set "username" = $1`), { cause })
}

describe('username uniqueness errors', () => {
  it('detects a raw pg unique violation on the username index', () => {
    expect(isUsernameTakenError(pgUniqueViolation('user_username_unique', 'username'))).toBe(true)
  })

  it('detects the violation through a drizzle cause chain', () => {
    expect(isUsernameTakenError(drizzleQueryError(pgUniqueViolation('user_username_unique', 'username')))).toBe(true)
  })

  it('matches only the requested constraint and code', () => {
    expect(isUniqueViolation(pgUniqueViolation('team_slug_unique', 'slug'), 'team_slug_unique')).toBe(true)
    expect(isUniqueViolation(pgUniqueViolation('user_username_unique', 'username'), 'team_slug_unique')).toBe(false)
    expect(isUniqueViolation(Object.assign(new Error('nope'), { code: '23503', constraint: 'user_username_unique' }), 'user_username_unique')).toBe(false)
    expect(isUniqueViolation(new Error('plain error'), 'user_username_unique')).toBe(false)
    expect(isUniqueViolation('not an error', 'user_username_unique')).toBe(false)
  })

  it('translates a taken username into a friendly error', async () => {
    const taken = withUsernameTakenError(async () => {
      throw drizzleQueryError(pgUniqueViolation('user_username_unique', 'username'))
    })
    await expect(taken).rejects.toThrow(UsernameTakenError)
    await expect(taken).rejects.toThrow('That username is already taken.')
  })

  it('returns the write result and unrelated errors unchanged', async () => {
    await expect(withUsernameTakenError(async () => 'result')).resolves.toBe('result')
    const unrelated = new Error('Current password is incorrect.')
    await expect(withUsernameTakenError(async () => {
      throw unrelated
    })).rejects.toBe(unrelated)
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
