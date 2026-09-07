'use server'
import type { ConstraintEntityCheck, ConstraintSide, EntityCandidateClassification, PropertyConstraints } from '@/lib/wikidata-constraints'
import type { ConstraintModelSupport } from '@/lib/wikidata-sparql'
import { requireViewCorpus } from '@/lib/corpus-access'
import { DEFAULT_WIKIBASE } from '@/lib/wikibase'
import { loadCorpusWikibaseConfig } from '@/lib/wikibase-server'
import {
  classifyEntityCandidatesViaWikidata,
  classifyPredicateCandidatesViaWikidata,
  fetchConstraintModelSupport,
  fetchPropertyConstraints,
  searchWikibaseEntities as searchWikibaseEntitiesLib,
} from '@/lib/wikidata-sparql'

export async function searchWikibaseEntities(corpusId: string, search: string, type: 'item' | 'property', limit: number) {
  await requireViewCorpus(corpusId)
  const config = await loadCorpusWikibaseConfig(corpusId)
  return searchWikibaseEntitiesLib(config, search, type, limit)
}

export async function fetchWikibasePropertyConstraints(corpusId: string, propertyIds: string[]) {
  await requireViewCorpus(corpusId)
  const config = await loadCorpusWikibaseConfig(corpusId)
  const { constraints, unavailable } = await fetchPropertyConstraints(config, propertyIds)
  return { constraints: Object.fromEntries(constraints), unavailable }
}

export async function classifyWikibaseEntityCandidates(
  corpusId: string,
  candidates: string[],
  constraints: PropertyConstraints,
  side: ConstraintSide,
): Promise<{ classification: EntityCandidateClassification, support: ConstraintModelSupport }> {
  await requireViewCorpus(corpusId)
  const config = await loadCorpusWikibaseConfig(corpusId)
  const support = await fetchConstraintModelSupport(config)
  if (support.status === 'unavailable') {
    return { classification: { members: candidates, unverifiable: [], filteredOut: [] }, support }
  }
  const classification = await classifyEntityCandidatesViaWikidata(config, candidates, constraints, side)
  return { classification, support }
}

export async function classifyWikibasePredicateCandidates(
  corpusId: string,
  candidates: string[],
  checks: ConstraintEntityCheck[],
): Promise<{ classification: EntityCandidateClassification, support: ConstraintModelSupport }> {
  await requireViewCorpus(corpusId)
  const config = await loadCorpusWikibaseConfig(corpusId)
  const support = await fetchConstraintModelSupport(config)
  if (support.status === 'unavailable') {
    return { classification: { members: candidates, unverifiable: [], filteredOut: [] }, support }
  }
  const classification = await classifyPredicateCandidatesViaWikidata(config, candidates, checks)
  return { classification, support }
}

export async function getWikibaseInstanceName() {
  return DEFAULT_WIKIBASE.instance
}
