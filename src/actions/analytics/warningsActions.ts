'use server'
import type { SQL } from 'drizzle-orm'
import type { AnnotationCheck, ConstraintCheck, CorpusWarnings, PropertyConstraints, WarningAnnotationRow, WarningQualifierRow } from '@/lib/wikidata-constraints'
import { and, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db/drizzle'
import { annotation, annotationComponent, annotationQualifier, corpus, document } from '@/db/schema'
import { requireViewCorpus, requireViewDocument } from '@/lib/corpus-access'
import { isConstraintWarningsEnabled } from '@/lib/corpus-settings'
import { buildConstraintChecks, buildQualifierRangeChecks, collectPairs, evaluateConstraintChecks, WIKIDATA_PROPERTY_PATTERN } from '@/lib/wikidata-constraints'
import { fetchEntityLabels, fetchItemsWithTypeData, fetchMembership, fetchPropertyConstraints } from '@/lib/wikidata-sparql'

type WarningsComputation = {
  violations: ConstraintCheck[]
  unverifiable: ConstraintCheck[]
  checkedProperties: number
  unavailable: boolean
}

function emptyWarnings(checkedAnnotations: number): CorpusWarnings {
  return {
    violations: [],
    unverifiable: [],
    checkedProperties: 0,
    checkedAnnotations,
    unavailable: false,
  }
}

function unavailableWarnings(checkedProperties: number): WarningsComputation {
  return {
    violations: [],
    unverifiable: [],
    checkedProperties,
    unavailable: true,
  }
}

async function computeWarningsForRows(
  rows: WarningAnnotationRow[],
  qualifierRows: WarningQualifierRow[],
): Promise<WarningsComputation> {
  const predicates = Array.from(new Set([
    ...rows
      .map(row => row.predicateValue)
      .filter((value): value is string => value != null && WIKIDATA_PROPERTY_PATTERN.test(value)),
    ...qualifierRows
      .map(row => row.qualifierPredicateValue)
      .filter((value): value is string => value != null && WIKIDATA_PROPERTY_PATTERN.test(value)),
  ]))

  if (predicates.length === 0) {
    return { violations: [], unverifiable: [], checkedProperties: 0, unavailable: false }
  }

  let fetchUnavailable: boolean
  let constraintsByProperty: Map<string, PropertyConstraints>
  try {
    const result = await fetchPropertyConstraints(predicates)
    fetchUnavailable = result.unavailable
    constraintsByProperty = result.constraints
  } catch {
    return unavailableWarnings(predicates.length)
  }

  const checks = [
    ...buildConstraintChecks(rows, constraintsByProperty),
    ...buildQualifierRangeChecks(qualifierRows, constraintsByProperty),
  ]
  const pairs = collectPairs(checks.map(check => ({ item: check.itemValue, side: check.side, classes: check.expectedClasses })))
  const items = Array.from(new Set(checks.map(check => check.itemValue)))

  let memberPairs: Set<string>
  let itemsWithTypeData: Set<string>
  try {
    [memberPairs, itemsWithTypeData] = await Promise.all([
      fetchMembership(pairs),
      fetchItemsWithTypeData(items),
    ])
  } catch {
    return unavailableWarnings(predicates.length)
  }

  const evaluated = evaluateConstraintChecks(checks, memberPairs, itemsWithTypeData)

  const classIds = Array.from(new Set(
    checks.flatMap(check => check.expectedClasses.map(constraint => constraint.class)),
  ))
  const classLabels = await fetchEntityLabels(classIds)

  const resolveClasses = (check: AnnotationCheck): ConstraintCheck => ({
    ...check,
    expectedClasses: check.expectedClasses.map(constraint => ({
      ...constraint,
      label: classLabels.get(constraint.class) ?? constraint.class,
    })),
  })

  return {
    violations: evaluated.violations.map(resolveClasses),
    unverifiable: evaluated.unverifiable.map(resolveClasses),
    checkedProperties: predicates.length,
    unavailable: fetchUnavailable,
  }
}

async function getWarningRows(condition: SQL): Promise<WarningAnnotationRow[]> {
  const predicate = alias(annotationComponent, 'predicate')
  const subject = alias(annotationComponent, 'subject')
  const object = alias(annotationComponent, 'object')

  return db.select({
    annotationId: annotation.id,
    documentId: annotation.documentId,
    documentTitle: document.title,
    predicateLabel: predicate.entityLabel,
    predicateValue: predicate.entityValue,
    subjectLabel: subject.entityLabel,
    subjectValue: subject.entityValue,
    objectLabel: object.entityLabel,
    objectValue: object.entityValue,
  })
    .from(annotation)
    .innerJoin(predicate, eq(predicate.id, annotation.predicateId))
    .innerJoin(subject, eq(subject.id, annotation.subjectId))
    .innerJoin(object, eq(object.id, annotation.objectId))
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(and(
      condition,
      sql`${predicate.entityValue} ~ '^P[0-9]+$'`,
    ))
}

async function getQualifierWarningRows(condition: SQL): Promise<WarningQualifierRow[]> {
  const predicate = alias(annotationComponent, 'predicate')
  const subject = alias(annotationComponent, 'subject')
  const object = alias(annotationComponent, 'object')
  const qualifierPredicate = alias(annotationComponent, 'qualifier_predicate')
  const qualifierValue = alias(annotationComponent, 'qualifier_value')

  return db.select({
    annotationId: annotation.id,
    documentId: annotation.documentId,
    documentTitle: document.title,
    qualifierId: annotationQualifier.id,
    predicateLabel: predicate.entityLabel,
    predicateValue: predicate.entityValue,
    subjectLabel: subject.entityLabel,
    subjectValue: subject.entityValue,
    objectLabel: object.entityLabel,
    objectValue: object.entityValue,
    qualifierPredicateLabel: qualifierPredicate.entityLabel,
    qualifierPredicateValue: qualifierPredicate.entityValue,
    qualifierValueLabel: qualifierValue.entityLabel,
    qualifierValueValue: qualifierValue.entityValue,
  })
    .from(annotation)
    .innerJoin(annotationQualifier, eq(annotationQualifier.annotationId, annotation.id))
    .innerJoin(predicate, eq(predicate.id, annotation.predicateId))
    .innerJoin(subject, eq(subject.id, annotation.subjectId))
    .innerJoin(object, eq(object.id, annotation.objectId))
    .innerJoin(qualifierPredicate, eq(qualifierPredicate.id, annotationQualifier.predicateId))
    .innerJoin(qualifierValue, eq(qualifierValue.id, annotationQualifier.valueId))
    .innerJoin(document, eq(document.id, annotation.documentId))
    .where(and(
      condition,
      sql`${qualifierPredicate.entityValue} ~ '^P[0-9]+$'`,
    ))
}

export async function getCorpusWarnings(corpusId: string): Promise<CorpusWarnings> {
  await requireViewCorpus(corpusId)

  const [corpusData] = await db.select().from(corpus).where(eq(corpus.id, corpusId))
  if (!corpusData) {
    throw new Error('Corpus not found')
  }

  if (!isConstraintWarningsEnabled(corpusData.settings)) {
    return emptyWarnings(0)
  }

  const rows = await getWarningRows(eq(document.corpusId, corpusId))
  const qualifierRows = await getQualifierWarningRows(eq(document.corpusId, corpusId))
  const { violations, unverifiable, checkedProperties, unavailable } = await computeWarningsForRows(rows, qualifierRows)

  return {
    violations,
    unverifiable,
    checkedProperties,
    checkedAnnotations: rows.length,
    unavailable,
  }
}

export async function getDocumentWarnings(documentId: string): Promise<CorpusWarnings> {
  await requireViewDocument(documentId)

  const [documentData] = await db
    .select({ id: document.id, corpusId: document.corpusId })
    .from(document)
    .where(eq(document.id, documentId))
  if (!documentData) {
    throw new Error('Document not found')
  }

  const [corpusData] = await db
    .select({ settings: corpus.settings })
    .from(corpus)
    .where(eq(corpus.id, documentData.corpusId))

  if (!isConstraintWarningsEnabled(corpusData?.settings)) {
    return emptyWarnings(0)
  }

  const rows = await getWarningRows(eq(annotation.documentId, documentId))
  const qualifierRows = await getQualifierWarningRows(eq(annotation.documentId, documentId))
  const { violations, unverifiable, checkedProperties, unavailable } = await computeWarningsForRows(rows, qualifierRows)

  return {
    violations,
    unverifiable,
    checkedProperties,
    checkedAnnotations: rows.length,
    unavailable,
  }
}
