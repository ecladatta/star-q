'use server'
import type { ConstraintEntityCheck, ConstraintSide, EntityCandidateClassification, PropertyConstraints } from '@/lib/wikidata-constraints'
import type { ConstraintModelSupport } from '@/lib/wikidata-sparql'
import { db } from '@/db/drizzle'
import { wikibaseInstances } from '@/db/schema'
import { requireViewCorpus } from '@/lib/corpus-access'
import { loadCorpusWikibaseConfig } from '@/lib/wikibase-server'
import {
  classifyEntityCandidatesViaWikidata,
  classifyPredicateCandidatesViaWikidata,
  fetchConstraintModelSupport,
  fetchPropertyConstraints,
  searchWikibaseEntities as searchWikibaseEntitiesLib,
} from '@/lib/wikidata-sparql'

const MAX_SEARCH_LENGTH = 200
const MAX_SEARCH_LIMIT = 50
const MAX_PROPERTY_IDS = 200
const MAX_CANDIDATES = 100
const MAX_CHECKS = 100

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 5
  }
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_SEARCH_LIMIT)
}

function truncateSearch(search: string): string {
  if (typeof search !== 'string') {
    return ''
  }
  return search.slice(0, MAX_SEARCH_LENGTH)
}

function capIds(ids: string[], max: number): string[] {
  if (!Array.isArray(ids)) {
    return []
  }
  return ids.filter(id => typeof id === 'string').slice(0, max)
}

function capItems<T>(items: T[], max: number): T[] {
  if (!Array.isArray(items)) {
    return []
  }
  return items.slice(0, max)
}

export async function searchWikibaseEntities(corpusId: string, search: string, type: 'item' | 'property', limit: number) {
  await requireViewCorpus(corpusId)
  const config = await loadCorpusWikibaseConfig(corpusId)
  if (!config) {
    return []
  }
  return searchWikibaseEntitiesLib(config, truncateSearch(search), type, clampLimit(limit))
}

export async function fetchWikibasePropertyConstraints(corpusId: string, propertyIds: string[]) {
  await requireViewCorpus(corpusId)
  const config = await loadCorpusWikibaseConfig(corpusId)
  if (!config) {
    return { constraints: {}, unavailable: true }
  }
  const { constraints, unavailable } = await fetchPropertyConstraints(config, capIds(propertyIds, MAX_PROPERTY_IDS))
  return { constraints: Object.fromEntries(constraints), unavailable }
}

export async function classifyWikibaseEntityCandidates(
  corpusId: string,
  candidates: string[],
  constraints: PropertyConstraints,
  side: ConstraintSide,
): Promise<{ classification: EntityCandidateClassification, support: ConstraintModelSupport }> {
  await requireViewCorpus(corpusId)
  const cappedCandidates = capIds(candidates, MAX_CANDIDATES)
  const config = await loadCorpusWikibaseConfig(corpusId)
  if (!config) {
    return { classification: { members: cappedCandidates, unverifiable: [], filteredOut: [] }, support: { status: 'unavailable', reason: 'fetch-failed' } }
  }
  const support = await fetchConstraintModelSupport(config)
  if (support.status === 'unavailable') {
    return { classification: { members: cappedCandidates, unverifiable: [], filteredOut: [] }, support }
  }
  const classification = await classifyEntityCandidatesViaWikidata(config, cappedCandidates, constraints, side)
  return { classification, support }
}

export async function classifyWikibasePredicateCandidates(
  corpusId: string,
  candidates: string[],
  checks: ConstraintEntityCheck[],
): Promise<{ classification: EntityCandidateClassification, support: ConstraintModelSupport }> {
  await requireViewCorpus(corpusId)
  const cappedCandidates = capIds(candidates, MAX_CANDIDATES)
  const cappedChecks = capItems(checks, MAX_CHECKS)
  const config = await loadCorpusWikibaseConfig(corpusId)
  if (!config) {
    return { classification: { members: cappedCandidates, unverifiable: [], filteredOut: [] }, support: { status: 'unavailable', reason: 'fetch-failed' } }
  }
  const support = await fetchConstraintModelSupport(config)
  if (support.status === 'unavailable') {
    return { classification: { members: cappedCandidates, unverifiable: [], filteredOut: [] }, support }
  }
  const classification = await classifyPredicateCandidatesViaWikidata(config, cappedCandidates, cappedChecks)
  return { classification, support }
}

export async function listWikibaseInstancesForCorpus(corpusId: string) {
  await requireViewCorpus(corpusId)
  return db.select().from(wikibaseInstances).orderBy(wikibaseInstances.label)
}
