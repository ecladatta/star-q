export const WIKIDATA_ITEM_PATTERN = /^Q\d+$/
export const WIKIDATA_PROPERTY_PATTERN = /^P\d+$/

export const CONSTRAINT_SUBJECT_TYPE = 'Q21503250'
export const CONSTRAINT_VALUE_TYPE = 'Q21510865'

export type ConstraintRelation = 'instance' | 'subclass' | 'instance-or-subclass'

export const CONSTRAINT_RELATION_LABELS: Record<ConstraintRelation, string> = {
  'instance': 'instance of',
  'subclass': 'subclass of',
  'instance-or-subclass': 'instance or subclass of',
}

export type ClassConstraint = {
  class: string
  relation: ConstraintRelation
}

export type PropertyConstraints = {
  domain: ClassConstraint[]
  range: ClassConstraint[]
}

export type ConstraintSide = 'domain' | 'range'

export type WikidataQualifier = {
  datavalue?: { value?: { id?: string } | string | null }
}

export type WikidataClaim = {
  mainsnak?: { datavalue?: { value?: { id?: string } | string | null } }
  qualifiers?: Record<string, WikidataQualifier[]>
}

export type WikidataClaims = Record<string, WikidataClaim[]>

const RELATION_TO_MODE: Record<string, ConstraintRelation> = {
  Q21503252: 'instance',
  Q21514624: 'subclass',
  Q30208840: 'instance-or-subclass',
}

export function parsePropertyConstraints(claims: WikidataClaims | undefined): PropertyConstraints {
  const constraints: PropertyConstraints = { domain: [], range: [] }

  const constraintClaims = claims?.P2302
  if (!constraintClaims) {
    return constraints
  }

  for (const claim of constraintClaims) {
    const valueId = claim.mainsnak?.datavalue?.value
    const value = typeof valueId === 'object' && valueId !== null ? valueId.id : undefined
    if (value !== CONSTRAINT_SUBJECT_TYPE && value !== CONSTRAINT_VALUE_TYPE) {
      continue
    }

    const side: ConstraintSide = value === CONSTRAINT_SUBJECT_TYPE ? 'domain' : 'range'
    const relationId = claim.qualifiers?.P2309?.[0]?.datavalue?.value
    const relation = typeof relationId === 'object' && relationId !== null
      ? RELATION_TO_MODE[relationId.id ?? '']
      : undefined
    if (!relation) {
      continue
    }

    const classQualifiers = claim.qualifiers?.P2308 ?? []
    for (const qualifier of classQualifiers) {
      const classValue = qualifier.datavalue?.value
      const classId = typeof classValue === 'object' && classValue !== null ? classValue.id : undefined
      if (classId && WIKIDATA_ITEM_PATTERN.test(classId)) {
        constraints[side].push({ class: classId, relation })
      }
    }
  }

  return constraints
}

export type WarningAnnotationRow = {
  annotationId: string
  documentId: string
  documentTitle: string
  predicateLabel: string | null
  predicateValue: string | null
  subjectLabel: string | null
  subjectValue: string | null
  objectLabel: string | null
  objectValue: string | null
}

export type WarningQualifierRow = {
  annotationId: string
  documentId: string
  documentTitle: string
  qualifierId: string
  predicateLabel: string | null
  predicateValue: string | null
  subjectLabel: string | null
  subjectValue: string | null
  objectLabel: string | null
  objectValue: string | null
  qualifierPredicateLabel: string | null
  qualifierPredicateValue: string | null
  qualifierValueLabel: string | null
  qualifierValueValue: string | null
}

export type AnnotationCheck = {
  annotationId: string
  documentId: string
  documentTitle: string
  kind: 'statement' | 'qualifier'
  side: ConstraintSide
  predicateLabel: string
  predicateValue: string
  subjectLabel: string | null
  subjectValue: string | null
  objectLabel: string | null
  objectValue: string | null
  itemValue: string
  itemLabel: string
  expectedClasses: ClassConstraint[]
  qualifierId?: string
  qualifierPredicateLabel?: string
  qualifierPredicateValue?: string
  qualifierValueLabel?: string
  qualifierValueValue?: string
}

export type ConstraintCheck = Omit<AnnotationCheck, 'expectedClasses'> & {
  expectedClasses: Array<ClassConstraint & { label: string }>
}

export type CorpusWarnings = {
  violations: ConstraintCheck[]
  unverifiable: ConstraintCheck[]
  checkedProperties: number
  checkedAnnotations: number
  unavailable: boolean
}

export function buildConstraintChecks(
  annotations: WarningAnnotationRow[],
  constraintsByProperty: Map<string, PropertyConstraints>,
): AnnotationCheck[] {
  const checks: AnnotationCheck[] = []

  for (const row of annotations) {
    if (!row.predicateValue) {
      continue
    }
    const constraints = constraintsByProperty.get(row.predicateValue)
    if (!constraints) {
      continue
    }

    const predicateLabel = row.predicateLabel ?? row.predicateValue

    for (const side of ['domain', 'range'] as const) {
      const itemValue = side === 'domain' ? row.subjectValue : row.objectValue
      if (itemValue && WIKIDATA_ITEM_PATTERN.test(itemValue) && constraints[side].length > 0) {
        const itemLabel = side === 'domain' ? (row.subjectLabel ?? itemValue) : (row.objectLabel ?? itemValue)
        checks.push({
          annotationId: row.annotationId,
          documentId: row.documentId,
          documentTitle: row.documentTitle,
          kind: 'statement',
          side,
          predicateLabel,
          predicateValue: row.predicateValue,
          subjectLabel: row.subjectLabel,
          subjectValue: row.subjectValue,
          objectLabel: row.objectLabel,
          objectValue: row.objectValue,
          itemValue,
          itemLabel,
          expectedClasses: constraints[side],
        })
      }
    }
  }

  return checks
}

export function buildQualifierRangeChecks(
  rows: WarningQualifierRow[],
  constraintsByProperty: Map<string, PropertyConstraints>,
): AnnotationCheck[] {
  const checks: AnnotationCheck[] = []

  for (const row of rows) {
    if (!row.qualifierPredicateValue || !WIKIDATA_PROPERTY_PATTERN.test(row.qualifierPredicateValue)) {
      continue
    }
    const constraints = constraintsByProperty.get(row.qualifierPredicateValue)
    if (!constraints || constraints.range.length === 0) {
      continue
    }
    const qualifierValue = row.qualifierValueValue
    if (!qualifierValue || !WIKIDATA_ITEM_PATTERN.test(qualifierValue)) {
      continue
    }

    checks.push({
      annotationId: row.annotationId,
      documentId: row.documentId,
      documentTitle: row.documentTitle,
      kind: 'qualifier',
      side: 'range',
      predicateLabel: row.predicateLabel ?? row.predicateValue ?? row.qualifierPredicateValue,
      predicateValue: row.predicateValue ?? row.qualifierPredicateValue,
      subjectLabel: row.subjectLabel,
      subjectValue: row.subjectValue,
      objectLabel: row.objectLabel,
      objectValue: row.objectValue,
      itemValue: qualifierValue,
      itemLabel: row.qualifierValueLabel ?? qualifierValue,
      expectedClasses: constraints.range,
      qualifierId: row.qualifierId,
      qualifierPredicateLabel: row.qualifierPredicateLabel ?? row.qualifierPredicateValue,
      qualifierPredicateValue: row.qualifierPredicateValue,
      qualifierValueLabel: row.qualifierValueLabel ?? qualifierValue,
      qualifierValueValue: qualifierValue,
    })
  }

  return checks
}

export type MembershipTriple = [item: string, classId: string, relation: ConstraintRelation]

export function membershipKey(item: string, classId: string, relation: ConstraintRelation): string {
  return JSON.stringify([item, classId, relation])
}

export type ConstraintCheckResult = {
  violations: AnnotationCheck[]
  unverifiable: AnnotationCheck[]
}

export function evaluateConstraintChecks(
  checks: AnnotationCheck[],
  memberPairs: Set<string>,
  itemsWithTypeData: Set<string>,
): ConstraintCheckResult {
  const violations: AnnotationCheck[] = []
  const unverifiable: AnnotationCheck[] = []

  for (const check of checks) {
    const isMember = check.expectedClasses.some(({ class: cls, relation }) =>
      memberPairs.has(membershipKey(check.itemValue, cls, relation)))
    if (isMember) {
      continue
    }
    if (itemsWithTypeData.has(check.itemValue)) {
      violations.push(check)
    } else {
      unverifiable.push(check)
    }
  }

  return { violations, unverifiable }
}

export type FilteredCandidate = {
  id: string
  sides: ConstraintSide[]
}

export type EntityCandidateClassification = {
  members: string[]
  unverifiable: string[]
  filteredOut: FilteredCandidate[]
}

export type ConstraintEntityCheck = {
  entityId: string
  side: ConstraintSide
}

export type MembershipSubject = {
  item: string
  side: ConstraintSide
  classes: ClassConstraint[]
}

export type CandidateMembership = {
  candidate: string
  subjects: MembershipSubject[]
}

export function collectPairs(subjects: MembershipSubject[]): MembershipTriple[] {
  const pairs = new Set<string>()
  for (const { item, classes } of subjects) {
    for (const { class: cls, relation } of classes) {
      pairs.add(membershipKey(item, cls, relation))
    }
  }
  return Array.from(pairs, pair => JSON.parse(pair) as MembershipTriple)
}

export function classifyCandidates(
  memberships: CandidateMembership[],
  memberPairs: Set<string>,
  itemsWithTypeData: Set<string>,
): EntityCandidateClassification {
  const members: string[] = []
  const unverifiable: string[] = []
  const filteredOut: FilteredCandidate[] = []

  for (const { candidate, subjects } of memberships) {
    const failedSides = new Set<ConstraintSide>()
    let unverified = false
    for (const { item, side, classes } of subjects) {
      if (classes.length === 0) {
        continue
      }
      const isMember = classes.some(({ class: cls, relation }) =>
        memberPairs.has(membershipKey(item, cls, relation)))
      if (isMember) {
        continue
      }
      if (itemsWithTypeData.has(item)) {
        failedSides.add(side)
      } else {
        unverified = true
      }
    }
    if (failedSides.size > 0) {
      filteredOut.push({ id: candidate, sides: Array.from(failedSides) })
    } else if (unverified) {
      unverifiable.push(candidate)
    } else {
      members.push(candidate)
    }
  }

  return { members, unverifiable, filteredOut }
}
