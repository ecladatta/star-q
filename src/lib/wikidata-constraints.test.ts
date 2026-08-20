import type {
  AnnotationCheck,
  CandidateMembership,
  ConstraintEntityCheck,
  MembershipSubject,
  PropertyConstraints,
  WarningAnnotationRow,
  WarningQualifierRow,
  WikidataClaim,
  WikidataClaims,
} from './wikidata-constraints'
import { expect, it } from 'vitest'
import {
  buildConstraintChecks,
  buildQualifierRangeChecks,
  classifyCandidates,
  collectPairs,
  evaluateConstraintChecks,
  parsePropertyConstraints,
} from './wikidata-constraints'

function constraintClaim(type: string, classes: string[], relation = 'Q30208840'): WikidataClaim {
  return {
    mainsnak: { datavalue: { value: { id: type } } },
    qualifiers: {
      P2308: classes.map(classId => ({ datavalue: { value: { id: classId } } })),
      P2309: [{ datavalue: { value: { id: relation } } }],
    },
  }
}

function claims(overrides: Partial<WikidataClaims> = {}): WikidataClaims {
  return {
    P2302: [
      constraintClaim('Q21503250', ['Q5', 'Q95074'], 'Q30208840'),
      constraintClaim('Q21510865', ['Q2385804'], 'Q21503252'),
      constraintClaim('Q19474404', ['Q5']),
    ],
    ...overrides,
  }
}

function row(overrides: Partial<WarningAnnotationRow> = {}): WarningAnnotationRow {
  return {
    annotationId: 'a1',
    documentId: 'd1',
    documentTitle: 'Doc 1',
    predicateLabel: 'educated at',
    predicateValue: 'P69',
    subjectLabel: 'Sigmund Freud',
    subjectValue: 'Q68550',
    objectLabel: 'University of Vienna',
    objectValue: 'Q7099',
    ...overrides,
  }
}

function constraints(overrides: Partial<PropertyConstraints> = {}): PropertyConstraints {
  return {
    domain: [{ class: 'Q5', relation: 'instance-or-subclass' }],
    range: [{ class: 'Q2385804', relation: 'instance' }],
    ...overrides,
  }
}

function check(overrides: Partial<AnnotationCheck> = {}): AnnotationCheck {
  return {
    annotationId: 'a1',
    documentId: 'd1',
    documentTitle: 'Doc 1',
    kind: 'statement',
    side: 'domain',
    predicateLabel: 'educated at',
    predicateValue: 'P69',
    subjectLabel: 'Sigmund Freud',
    subjectValue: 'Q68550',
    objectLabel: 'University of Vienna',
    objectValue: 'Q7099',
    itemValue: 'Q68550',
    itemLabel: 'Sigmund Freud',
    expectedClasses: constraints().domain,
    ...overrides,
  }
}

it('parses domain and range constraints from P2302 claims', () => {
  const result = parsePropertyConstraints(claims())

  expect(result.domain).toEqual([
    { class: 'Q5', relation: 'instance-or-subclass' },
    { class: 'Q95074', relation: 'instance-or-subclass' },
  ])
  expect(result.range).toEqual([{ class: 'Q2385804', relation: 'instance' }])
})

it('ignores non-subject/value constraint types and invalid class ids', () => {
  const result = parsePropertyConstraints({
    P2302: [
      constraintClaim('Q19474404', ['Q5']),
      constraintClaim('Q21503250', ['Q5', 'not-an-id'], 'Q21503252'),
      constraintClaim('Q21510865', []),
    ],
  })

  expect(result.domain).toEqual([{ class: 'Q5', relation: 'instance' }])
  expect(result.range).toEqual([])
})

it('skips constraints that lack a relation qualifier', () => {
  const withoutClasses = parsePropertyConstraints({
    P2302: [{ mainsnak: { datavalue: { value: { id: 'Q21503250' } } } }],
  })

  expect(withoutClasses.domain).toEqual([])
  const withClasses = parsePropertyConstraints({
    P2302: [{
      mainsnak: { datavalue: { value: { id: 'Q21503250' } } },
      qualifiers: { P2308: [{ datavalue: { value: { id: 'Q5' } } }] },
    }],
  })
  expect(withClasses.domain).toEqual([])
})

it('skips constraints with an unrecognized relation qualifier', () => {
  const result = parsePropertyConstraints({
    P2302: [{
      mainsnak: { datavalue: { value: { id: 'Q21503250' } } },
      qualifiers: {
        P2308: [{ datavalue: { value: { id: 'Q5' } } }],
        P2309: [{ datavalue: { value: { id: 'Q999999' } } }],
      },
    }],
  })

  expect(result.domain).toEqual([])
})

it('returns empty constraints for missing P2302 claims', () => {
  expect(parsePropertyConstraints(undefined)).toEqual({ domain: [], range: [] })
  expect(parsePropertyConstraints({})).toEqual({ domain: [], range: [] })
})

it('builds domain and range checks for Q-valued subject and object', () => {
  const checks = buildConstraintChecks([row()], new Map([['P69', constraints()]]))

  expect(checks).toHaveLength(2)
  expect(checks[0]).toMatchObject({
    side: 'domain',
    itemValue: 'Q68550',
    expectedClasses: [{ class: 'Q5', relation: 'instance-or-subclass' }],
  })
  expect(checks[1]).toMatchObject({
    side: 'range',
    itemValue: 'Q7099',
    expectedClasses: [{ class: 'Q2385804', relation: 'instance' }],
  })
})

it('skips annotations whose predicate has no constraints', () => {
  const checks = buildConstraintChecks([row()], new Map())
  expect(checks).toEqual([])
})

it('skips checks for sides that are not Wikidata items', () => {
  const checks = buildConstraintChecks(
    [row({ subjectValue: null, objectValue: 'literal' })],
    new Map([['P69', constraints()]]),
  )
  expect(checks).toEqual([])
})

it('skips sides whose constraint class list is empty', () => {
  const empty: PropertyConstraints = { domain: [], range: [] }
  const checks = buildConstraintChecks([row()], new Map([['P69', empty]]))
  expect(checks).toEqual([])
})

it('collects distinct membership pairs across checks', () => {
  const checks: AnnotationCheck[] = [
    check({
      itemValue: 'Q1',
      expectedClasses: [{ class: 'Q5', relation: 'instance-or-subclass' }],
    }),
    check({
      itemValue: 'Q1',
      expectedClasses: [{ class: 'Q9', relation: 'subclass' }],
    }),
    check({
      itemValue: 'Q2',
      expectedClasses: [{ class: 'Q5', relation: 'instance-or-subclass' }],
    }),
  ]

  expect(collectPairs(checks.map(check => ({
    item: check.itemValue,
    side: check.side,
    classes: check.expectedClasses,
  })))).toEqual([
    ['Q1', 'Q5', 'instance-or-subclass'],
    ['Q1', 'Q9', 'subclass'],
    ['Q2', 'Q5', 'instance-or-subclass'],
  ])
})

it('classifies members, violations, and unverifiable checks', () => {
  const checks: AnnotationCheck[] = [
    check({ annotationId: 'member', itemValue: 'Q1' }),
    check({ annotationId: 'violation', itemValue: 'Q2' }),
    check({ annotationId: 'unverifiable', itemValue: 'Q3' }),
  ]

  const memberPairs = new Set(['Q1|Q5|instance-or-subclass'])
  const itemsWithTypeData = new Set(['Q1', 'Q2'])

  const result = evaluateConstraintChecks(checks, memberPairs, itemsWithTypeData)

  expect(result.violations.map(resultCheck => resultCheck.annotationId)).toEqual(['violation'])
  expect(result.unverifiable.map(resultCheck => resultCheck.annotationId)).toEqual(['unverifiable'])
})

it('does not satisfy an instance constraint with subclass-only membership', () => {
  const checks: AnnotationCheck[] = [check({
    annotationId: 'instance-check',
    itemValue: 'Q1',
    expectedClasses: [{ class: 'Q5', relation: 'instance' }],
  })]

  const result = evaluateConstraintChecks(
    checks,
    new Set(['Q1|Q5|subclass']),
    new Set(['Q1']),
  )

  expect(result.violations.map(check => check.annotationId)).toEqual(['instance-check'])
  expect(result.unverifiable).toEqual([])
})

it('satisfies an instance-or-subclass constraint with matching membership', () => {
  const checks: AnnotationCheck[] = [check({
    annotationId: 'instance-or-subclass-check',
    itemValue: 'Q1',
    expectedClasses: [{ class: 'Q5', relation: 'instance-or-subclass' }],
  })]

  const result = evaluateConstraintChecks(
    checks,
    new Set(['Q1|Q5|instance-or-subclass']),
    new Set(['Q1']),
  )

  expect(result.violations).toEqual([])
  expect(result.unverifiable).toEqual([])
})

it('does not flag a check whose item has no type data as a violation', () => {
  const checks: AnnotationCheck[] = [check({ itemValue: 'Q1', itemLabel: 'Unknown' })]
  const result = evaluateConstraintChecks(checks, new Set(), new Set())

  expect(result.violations).toEqual([])
  expect(result.unverifiable).toHaveLength(1)
})

it('collects distinct membership pairs across subjects', () => {
  const subjects: MembershipSubject[] = [
    { item: 'Q1', side: 'domain', classes: [{ class: 'Q5', relation: 'instance-or-subclass' }] },
    { item: 'Q2', side: 'range', classes: [{ class: 'Q9', relation: 'instance' }] },
    { item: 'Q1', side: 'domain', classes: [{ class: 'Q5', relation: 'instance-or-subclass' }] },
  ]

  expect(collectPairs(subjects)).toEqual([
    ['Q1', 'Q5', 'instance-or-subclass'],
    ['Q2', 'Q9', 'instance'],
  ])
})

it('classifies entity candidates into members, unverifiable, and filtered out', () => {
  const memberships: CandidateMembership[] = ['Q1', 'Q2', 'Q3'].map(candidate => ({
    candidate,
    subjects: [{ item: candidate, side: 'domain', classes: constraints().domain }],
  }))
  const memberPairs = new Set(['Q1|Q5|instance-or-subclass'])
  const itemsWithTypeData = new Set(['Q1', 'Q2'])

  const result = classifyCandidates(memberships, memberPairs, itemsWithTypeData)

  expect(result).toEqual({
    members: ['Q1'],
    unverifiable: ['Q3'],
    filteredOut: [{ id: 'Q2', sides: ['domain'] }],
  })
})

it('treats a candidate whose subjects have no constraints as compatible', () => {
  const memberships: CandidateMembership[] = [
    { candidate: 'P1', subjects: [{ item: 'Q1', side: 'domain', classes: [] }] },
    { candidate: 'P9', subjects: [] },
  ]

  const result = classifyCandidates(memberships, new Set(), new Set())

  expect(result).toEqual({ members: ['P1', 'P9'], unverifiable: [], filteredOut: [] })
})

it('marks a candidate unverifiable when its subject lacks type data', () => {
  const memberships: CandidateMembership[] = [{
    candidate: 'P1',
    subjects: [{ item: 'Q9', side: 'range', classes: [{ class: 'Q5', relation: 'instance-or-subclass' }] }],
  }]

  const result = classifyCandidates(memberships, new Set(), new Set())

  expect(result).toEqual({ members: [], unverifiable: ['P1'], filteredOut: [] })
})

it('requires every subject to pass (intersection semantics)', () => {
  const memberships: CandidateMembership[] = [{
    candidate: 'P1',
    subjects: [
      { item: 'Q1', side: 'domain', classes: [{ class: 'Q5', relation: 'instance' }] },
      { item: 'Q2', side: 'range', classes: [{ class: 'Q9', relation: 'instance' }] },
    ],
  }]
  const memberPairs = new Set(['Q1|Q5|instance'])
  const itemsWithTypeData = new Set(['Q1', 'Q2'])

  const result = classifyCandidates(memberships, memberPairs, itemsWithTypeData)

  expect(result).toEqual({ members: [], unverifiable: [], filteredOut: [{ id: 'P1', sides: ['range'] }] })
})

it('filters out a candidate whose subject has a type but no matching membership', () => {
  const memberships: CandidateMembership[] = [{
    candidate: 'P3',
    subjects: [{ item: 'Q1', side: 'domain', classes: [{ class: 'Q9', relation: 'instance' }] }],
  }]
  const memberPairs = new Set(['Q1|Q5|instance-or-subclass'])
  const itemsWithTypeData = new Set(['Q1'])

  const result = classifyCandidates(memberships, memberPairs, itemsWithTypeData)

  expect(result).toEqual({ members: [], unverifiable: [], filteredOut: [{ id: 'P3', sides: ['domain'] }] })
})

it('classifies predicate candidates across entity domain checks', () => {
  const constraintsByProperty = new Map<string, PropertyConstraints>([
    ['P1', { domain: [{ class: 'Q5', relation: 'instance-or-subclass' }], range: [] }],
    ['P2', { domain: [], range: [] }],
    ['P3', { domain: [{ class: 'Q9', relation: 'instance' }], range: [] }],
  ])
  const checks: ConstraintEntityCheck[] = [{ entityId: 'Q1', side: 'domain' }]
  const memberships: CandidateMembership[] = ['P1', 'P2', 'P3'].map(candidate => ({
    candidate,
    subjects: checks.map(check => ({
      item: check.entityId,
      side: check.side,
      classes: constraintsByProperty.get(candidate)?.[check.side] ?? [],
    })),
  }))
  const memberPairs = new Set(['Q1|Q5|instance-or-subclass'])
  const itemsWithTypeData = new Set(['Q1'])

  const result = classifyCandidates(memberships, memberPairs, itemsWithTypeData)

  expect(result).toEqual({ members: ['P1', 'P2'], unverifiable: [], filteredOut: [{ id: 'P3', sides: ['domain'] }] })
})

function qualifierRow(overrides: Partial<WarningQualifierRow> = {}): WarningQualifierRow {
  return {
    annotationId: 'a1',
    documentId: 'd1',
    documentTitle: 'Doc 1',
    qualifierId: 'q1',
    predicateLabel: 'educated at',
    predicateValue: 'P69',
    subjectLabel: 'Sigmund Freud',
    subjectValue: 'Q68550',
    objectLabel: 'University of Vienna',
    objectValue: 'Q7099',
    qualifierPredicateLabel: 'start time',
    qualifierPredicateValue: 'P580',
    qualifierValueLabel: '1900',
    qualifierValueValue: 'Q1',
    ...overrides,
  }
}

it('builds a range check for a qualifier with a Q-valued qualifier value', () => {
  const checks = buildQualifierRangeChecks(
    [qualifierRow()],
    new Map([['P580', { domain: [], range: [{ class: 'Q5', relation: 'instance-or-subclass' }] }]]),
  )

  expect(checks).toHaveLength(1)
  expect(checks[0]).toMatchObject({
    kind: 'qualifier',
    side: 'range',
    itemValue: 'Q1',
    itemLabel: '1900',
    expectedClasses: [{ class: 'Q5', relation: 'instance-or-subclass' }],
    predicateValue: 'P69',
    subjectValue: 'Q68550',
    objectValue: 'Q7099',
    qualifierId: 'q1',
    qualifierPredicateValue: 'P580',
    qualifierValueValue: 'Q1',
  })
})

it('skips qualifiers whose predicate is not a Wikidata property', () => {
  const checks = buildQualifierRangeChecks([qualifierRow({ qualifierPredicateValue: 'not-a-prop' })], new Map())
  expect(checks).toEqual([])
})

it('skips qualifiers whose value is not a Wikidata item', () => {
  const checks = buildQualifierRangeChecks(
    [qualifierRow({ qualifierValueValue: 'literal' })],
    new Map([['P580', { domain: [], range: [{ class: 'Q5', relation: 'instance' }] }]]),
  )
  expect(checks).toEqual([])
})

it('skips qualifiers whose predicate has no range constraint', () => {
  const checks = buildQualifierRangeChecks(
    [qualifierRow()],
    new Map([['P580', { domain: [{ class: 'Q5', relation: 'instance' }], range: [] }]]),
  )
  expect(checks).toEqual([])
})

it('skips qualifiers whose predicate has no constraints at all', () => {
  const checks = buildQualifierRangeChecks([qualifierRow()], new Map())
  expect(checks).toEqual([])
})
