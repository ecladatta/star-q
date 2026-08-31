const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])?$/
const TEAM_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/

function validateChoice<const T extends readonly string[]>(value: string, choices: T, label: string): T[number] {
  if (!choices.includes(value)) {
    throw new Error(`Invalid ${label}.`)
  }
  return value as T[number]
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function validateUsername(value: string): string {
  const username = normalizeUsername(value)
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Username must be 3-32 characters and use only letters, numbers, underscores, or hyphens.')
  }
  return username
}

export function slugifyTeamName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeTeamSlug(value: string): string {
  return value.trim().toLowerCase()
}

export function validateTeamSlug(value: string): string {
  const slug = normalizeTeamSlug(value)
  if (!TEAM_SLUG_PATTERN.test(slug)) {
    throw new Error('Team slug must be 3-48 characters and use only letters, numbers, or hyphens.')
  }
  return slug
}

export function validateDisplayName(value: string): string {
  const name = value.trim()
  if (name.length < 1 || name.length > 100) {
    throw new Error('Display name must be between 1 and 100 characters.')
  }
  return name
}

export function validatePassword(value: string): string {
  if (value.length < 4 || value.length > 128) {
    throw new Error('Password must be between 4 and 128 characters.')
  }
  return value
}

export function validateUserRole(value: string): 'user' | 'admin' {
  return validateChoice(value, ['user', 'admin'] as const, 'user role')
}

export function validateTeamRole(value: string): 'owner' | 'member' {
  return validateChoice(value, ['owner', 'member'] as const, 'team role')
}

export function validateCorpusCollaboratorRole(value: string): 'viewer' | 'editor' {
  return validateChoice(value, ['viewer', 'editor'] as const, 'corpus collaborator role')
}

export function validateInvitationResponse(value: string): 'accepted' | 'declined' {
  return validateChoice(value, ['accepted', 'declined'] as const, 'invitation response')
}

export function validateCorpusVisibility(value: string): 'private' | 'public' {
  return validateChoice(value, ['private', 'public'] as const, 'corpus visibility')
}

export function validateOAuthProvider(value: string): 'github' | 'wikimedia' {
  return validateChoice(value, ['github', 'wikimedia'] as const, 'OAuth provider')
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'This account is already linked to a different account. Sign in with the account that owns it, or ask an administrator to resolve the conflict.',
  CredentialsSignin: 'Invalid username or password.',
  AccessDenied: 'You do not have permission to sign in. Your account may be blocked.',
  Configuration: 'There is a problem with the server configuration. Contact an administrator.',
  Verification: 'The verification link is invalid or has expired.',
  CallbackRouteError: 'There was a problem completing sign-in. Please try again.',
}

export function authErrorMessage(value: string | string[] | undefined): string | null {
  const code = Array.isArray(value) ? value[0] : value
  if (!code) {
    return null
  }
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.'
}
