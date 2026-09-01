export const corpusAccessValues = ['viewer', 'editor', 'manager'] as const
export type CorpusAccess = (typeof corpusAccessValues)[number]

const accessRank: Record<CorpusAccess, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
}

export type CorpusAccessFacts = {
  actorType: 'user' | 'anonymous' | 'admin-read-key'
  visibility: 'private' | 'public'
  isAdmin?: boolean
  owningTeamRole?: 'owner' | 'member' | null
  directCollaborationRoles?: Array<'viewer' | 'editor'>
  teamCollaborationRoles?: Array<'viewer' | 'editor'>
}

function highestAccess(current: CorpusAccess | null, candidate: CorpusAccess | null): CorpusAccess | null {
  if (!candidate) {
    return current
  }
  if (!current || accessRank[candidate] > accessRank[current]) {
    return candidate
  }
  return current
}

export function hasMinimumCorpusAccess(access: CorpusAccess, minimum: CorpusAccess): boolean {
  return accessRank[access] >= accessRank[minimum]
}

export function resolveCorpusAccess(facts: CorpusAccessFacts): CorpusAccess | null {
  if (facts.actorType === 'admin-read-key') {
    return 'viewer'
  }
  if (facts.actorType === 'user' && facts.isAdmin) {
    return 'manager'
  }

  let access: CorpusAccess | null = facts.visibility === 'public' ? 'viewer' : null
  if (facts.actorType === 'anonymous') {
    return access
  }
  if (facts.owningTeamRole === 'owner') {
    return 'manager'
  }
  if (facts.owningTeamRole === 'member') {
    access = highestAccess(access, 'editor')
  }
  for (const role of facts.directCollaborationRoles ?? []) {
    access = highestAccess(access, role)
  }
  for (const role of facts.teamCollaborationRoles ?? []) {
    access = highestAccess(access, role)
  }
  return access
}
