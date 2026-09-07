'use server'
import type { ConstraintEntityCheck, ConstraintSide, EntityCandidateClassification, PropertyConstraints } from '@/lib/wikidata-constraints'
import type { ConstraintModelSupport } from '@/lib/wikidata-sparql'
import { WIKIBASE } from '@/lib/wikibase'
import {
  classifyEntityCandidatesViaWikidata,
  classifyPredicateCandidatesViaWikidata,
  fetchConstraintModelSupport,
  fetchPropertyConstraints,
  searchWikibaseEntities as searchWikibaseEntitiesLib,
} from '@/lib/wikidata-sparql'

export async function searchWikibaseEntities(search: string, type: 'item' | 'property', limit: number) {
  return searchWikibaseEntitiesLib(search, type, limit)
}

export async function fetchWikibasePropertyConstraints(propertyIds: string[]) {
  const { constraints, unavailable } = await fetchPropertyConstraints(propertyIds)
  return { constraints: Object.fromEntries(constraints), unavailable }
}

export async function classifyWikibaseEntityCandidates(
  candidates: string[],
  constraints: PropertyConstraints,
  side: ConstraintSide,
): Promise<{ classification: EntityCandidateClassification, support: ConstraintModelSupport }> {
  const [classification, support] = await Promise.all([
    classifyEntityCandidatesViaWikidata(candidates, constraints, side),
    fetchConstraintModelSupport(),
  ])
  return { classification, support }
}

export async function classifyWikibasePredicateCandidates(
  candidates: string[],
  checks: ConstraintEntityCheck[],
): Promise<{ classification: EntityCandidateClassification, support: ConstraintModelSupport }> {
  const [classification, support] = await Promise.all([
    classifyPredicateCandidatesViaWikidata(candidates, checks),
    fetchConstraintModelSupport(),
  ])
  return { classification, support }
}

export async function getWikibaseInstanceName() {
  return WIKIBASE.instance
}
