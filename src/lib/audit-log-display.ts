export type AuditActionCategory = 'auth' | 'user' | 'team' | 'corpus' | 'admin' | 'instance'

export const AUDIT_ACTION_CATEGORIES: { id: AuditActionCategory, label: string }[] = [
  { id: 'auth', label: 'Auth & access' },
  { id: 'user', label: 'Account' },
  { id: 'team', label: 'Team' },
  { id: 'corpus', label: 'Corpus' },
  { id: 'admin', label: 'Administration' },
  { id: 'instance', label: 'Instance' },
]

const CATEGORY_IDS = new Set<string>(AUDIT_ACTION_CATEGORIES.map(category => category.id))

export function auditActionCategory(action: string): AuditActionCategory | null {
  const prefix = action.split('.')[0]
  return CATEGORY_IDS.has(prefix) ? prefix as AuditActionCategory : null
}

export type AuditEventInput = {
  action: string
  targetType: string
  targetId: string | null
  metadata: Record<string, unknown>
}

function metadataText(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key]
  return value === null || value === undefined ? undefined : String(value)
}

function targetRef(event: AuditEventInput, noun: string): string {
  return event.targetId ? `${noun} ${event.targetId}` : `a ${noun}`
}

function join(sentence: string, clause: string | undefined): string {
  return clause ? `${sentence} ${clause}` : sentence
}

function addedSentence(event: AuditEventInput, verb: 'Added' | 'Invited', targetKey: 'targetUserId' | 'targetTeamId', noun: string): string {
  const target = metadataText(event.metadata, targetKey)
  const role = metadataText(event.metadata, 'role')
  const sentence = target
    ? `${verb} ${noun} ${target} to ${targetRef(event, 'corpus')}`
    : `${verb} a collaborator to ${targetRef(event, 'corpus')}`
  return join(sentence, role ? `as ${role}` : undefined)
}

const AUDIT_ACTION_SENTENCES: Record<string, (event: AuditEventInput) => string> = {
  'auth.sign_in': (event) => {
    const provider = metadataText(event.metadata, 'provider')
    return provider ? `Signed in with ${provider}` : 'Signed in'
  },
  'auth.sign_up': (event) => {
    const provider = metadataText(event.metadata, 'provider')
    return provider ? `Signed up with ${provider}` : 'Signed up'
  },
  'auth.provider_linked': (event) => {
    const provider = metadataText(event.metadata, 'provider')
    return provider ? `Linked ${provider} account` : 'Linked an account'
  },
  'auth.provider_unlinked': (event) => {
    const provider = metadataText(event.metadata, 'provider')
    return provider ? `Unlinked ${provider} account` : 'Unlinked an account'
  },
  'auth.password_changed': () => 'Changed password',
  'auth.onboarding_completed': () => 'Completed onboarding',
  'user.profile_updated': () => 'Updated profile',
  'team.created': event => `Created ${targetRef(event, 'team')}`,
  'team.personal_created': () => 'Created the personal team',
  'team.invitation_sent': (event) => {
    const invitee = metadataText(event.metadata, 'inviteeUserId')
    const role = metadataText(event.metadata, 'role')
    return join(invitee ? `Invited ${invitee} to ${targetRef(event, 'team')}` : 'Sent a team invitation', role ? `as ${role}` : undefined)
  },
  'team.invitation_accepted': () => 'Accepted the team invitation',
  'team.invitation_declined': () => 'Declined the team invitation',
  'team.invitation_cancelled': () => 'Cancelled the team invitation',
  'team.member_role_updated': (event) => {
    const member = metadataText(event.metadata, 'userId')
    const role = metadataText(event.metadata, 'role')
    const sentence = member
      ? `Changed the role of member ${member} in ${targetRef(event, 'team')}`
      : `Updated a member role in ${targetRef(event, 'team')}`
    return join(sentence, role ? `to ${role}` : undefined)
  },
  'team.member_removed': (event) => {
    const member = metadataText(event.metadata, 'userId')
    return member ? `Removed member ${member} from the team` : 'Removed a member from the team'
  },
  'team.member_left': () => 'Left the team',
  'team.deleted': () => 'Deleted the team',
  'corpus.created': event => `Created ${targetRef(event, 'corpus')}`,
  'corpus.deleted': event => `Deleted ${targetRef(event, 'corpus')}`,
  'corpus.owner_changed': (event) => {
    const owner = metadataText(event.metadata, 'ownerTeamId')
    return join(`Changed the owner of ${targetRef(event, 'corpus')}`, owner ? `to ${owner}` : undefined)
  },
  'corpus.visibility_updated': (event) => {
    const visibility = metadataText(event.metadata, 'visibility')
    return visibility
      ? `Made ${targetRef(event, 'corpus')} ${visibility}`
      : `Updated the visibility of ${targetRef(event, 'corpus')}`
  },
  'corpus.archived': event => `Archived ${targetRef(event, 'corpus')}`,
  'corpus.unarchived': event => `Unarchived ${targetRef(event, 'corpus')}`,
  'corpus.user_added': event => addedSentence(event, 'Added', 'targetUserId', 'user'),
  'corpus.team_added': event => addedSentence(event, 'Added', 'targetTeamId', 'team'),
  'corpus.user_invited': event => addedSentence(event, 'Invited', 'targetUserId', 'user'),
  'corpus.team_invited': event => addedSentence(event, 'Invited', 'targetTeamId', 'team'),
  'corpus.collaborator_role_updated': (event) => {
    const member = metadataText(event.metadata, 'targetUserId') ?? metadataText(event.metadata, 'targetTeamId')
    const role = metadataText(event.metadata, 'role')
    const sentence = member
      ? `Changed the role of ${member} on ${targetRef(event, 'corpus')}`
      : `Updated a collaborator role on ${targetRef(event, 'corpus')}`
    return join(sentence, role ? `to ${role}` : undefined)
  },
  'corpus.collaboration_revoked': event => `Revoked a collaboration on ${targetRef(event, 'corpus')}`,
  'corpus.collaboration_left': event => `Left the collaboration on ${targetRef(event, 'corpus')}`,
  'corpus.invitation_accepted': () => 'Accepted the corpus invitation',
  'corpus.invitation_declined': () => 'Declined the corpus invitation',
  'admin.user_created': (event) => {
    const role = metadataText(event.metadata, 'role')
    return join(`Created ${targetRef(event, 'user')}`, role ? `with role ${role}` : undefined)
  },
  'admin.user_updated': (event) => {
    const role = metadataText(event.metadata, 'role')
    return join(`Updated ${targetRef(event, 'user')}`, role ? `with role ${role}` : undefined)
  },
  'admin.user_blocked': event => `Blocked ${targetRef(event, 'user')}`,
  'admin.user_unblocked': event => `Unblocked ${targetRef(event, 'user')}`,
  'admin.password_reset': event => `Reset the password of ${targetRef(event, 'user')}`,
  'admin.user_deleted': event => `Deleted ${targetRef(event, 'user')}`,
  'admin.api_key_created': (event) => {
    const name = metadataText(event.metadata, 'name')
    return name ? `Created API key ${name}` : 'Created an API key'
  },
  'admin.api_key_deleted': () => 'Deleted an API key',
  'admin.wikibase_instance_created': event => `Created ${targetRef(event, 'Wikibase instance')}`,
  'admin.wikibase_instance_updated': event => `Updated ${targetRef(event, 'Wikibase instance')}`,
  'admin.wikibase_instance_enabled': event => `Enabled ${targetRef(event, 'Wikibase instance')}`,
  'admin.wikibase_instance_disabled': event => `Disabled ${targetRef(event, 'Wikibase instance')}`,
  'admin.wikibase_instance_default_set': event => `Set ${targetRef(event, 'Wikibase instance')} as the default`,
  'admin.wikibase_instance_deleted': event => `Deleted ${targetRef(event, 'Wikibase instance')}`,
  'instance.settings_updated': () => 'Updated the instance settings',
  'instance.setup_completed': () => 'Completed the instance setup',
}

const AUDIT_CATEGORY_FALLBACKS: Record<AuditActionCategory, string> = {
  auth: 'Performed an authentication action',
  user: 'Performed an account action',
  team: 'Performed a team action',
  corpus: 'Performed a corpus action',
  admin: 'Performed an administration action',
  instance: 'Performed an instance action',
}

export function describeAuditEvent(event: AuditEventInput): string {
  const describe = AUDIT_ACTION_SENTENCES[event.action]
  if (describe) {
    return describe(event)
  }
  const category = auditActionCategory(event.action)
  return category ? AUDIT_CATEGORY_FALLBACKS[category] : event.action
}

export function relativeTime(date: Date, now: Date = new Date()): string {
  const elapsedMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (elapsedMinutes < 1) {
    return 'just now'
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) {
    return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`
  }
  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays < 30) {
    return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`
  }
  return date.toLocaleDateString()
}
