import type { DbExecutor } from '@/db/drizzle'
import type { Unit } from '@/db/schema'
import type { UnitCandidate, UnitRef } from '@/types/types'
import { and, asc, count, eq, ilike, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { annotationComponent, unit } from '@/db/schema'
import { MAX_CUSTOM_ENTITIES_PER_CORPUS } from '@/lib/constants'
import { loadCorpusWikibaseConfig } from '@/lib/wikibase-server'
import { searchWikibaseUnits } from '@/lib/wikidata-sparql'

export const WIKIDATA_ID_PATTERN = /^Q\d+$/

// Wikidata units are identified by their Q-id, corpus-local units by label.
export async function findOrCreateUnit(executor: DbExecutor, corpusId: string, unitRef: UnitRef): Promise<string> {
  const isWikidata = unitRef.wikidataId !== null

  const [result] = await executor.insert(unit).values({
    corpusId,
    label: unitRef.label,
    wikidataId: unitRef.wikidataId,
  }).onConflictDoUpdate({
    target: isWikidata ? [unit.corpusId, unit.wikidataId] : [unit.corpusId, unit.label],
    // Matches the partial unique indexes, which split on wikidata_id nullness.
    targetWhere: isWikidata ? sql`${unit.wikidataId} IS NOT NULL` : sql`${unit.wikidataId} IS NULL`,
    set: { label: unitRef.label, updatedAt: new Date() },
  }).returning({ id: unit.id })

  return result.id
}

export async function createCorpusUnit(executor: DbExecutor, corpusId: string, label: string): Promise<Unit> {
  const [existing] = await executor.select({ count: count() }).from(unit).where(
    and(eq(unit.corpusId, corpusId), isNull(unit.wikidataId)),
  )
  if ((existing?.count ?? 0) >= MAX_CUSTOM_ENTITIES_PER_CORPUS) {
    throw new Error(`A corpus can have at most ${MAX_CUSTOM_ENTITIES_PER_CORPUS} units.`)
  }

  const [result] = await executor.insert(unit).values({
    corpusId,
    label,
    wikidataId: null,
  }).returning()

  return result
}

// Label only: a unit's wikidata_id is its immutable identity.
export async function updateCorpusUnit(executor: DbExecutor, id: string, label: string): Promise<void> {
  await executor.update(unit).set({ label, updatedAt: new Date() }).where(eq(unit.id, id))
}

export async function deleteCorpusUnit(executor: DbExecutor, id: string): Promise<void> {
  const [inUse] = await executor.select({ count: count() }).from(annotationComponent).where(eq(annotationComponent.unitId, id))
  if ((inUse?.count ?? 0) > 0) {
    throw new Error(`This unit is used by ${inUse.count} annotation${inUse.count === 1 ? '' : 's'} and cannot be deleted.`)
  }
  await executor.delete(unit).where(eq(unit.id, id))
}

// Shared by every unit listing so the ordering rule lives in one place.
export function unitOrdering() {
  return [sql`${unit.wikidataId} IS NOT NULL DESC`, asc(unit.label)] as const
}

export async function listCorpusUnits(corpusId: string): Promise<Array<Unit & { usageCount: number }>> {
  return db
    .select({
      id: unit.id,
      corpusId: unit.corpusId,
      label: unit.label,
      wikidataId: unit.wikidataId,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
      usageCount: count(annotationComponent.id),
    })
    .from(unit)
    .leftJoin(annotationComponent, eq(annotationComponent.unitId, unit.id))
    .where(eq(unit.corpusId, corpusId))
    .groupBy(unit.id)
    .orderBy(...unitOrdering())
}

// Unit search results for the quantity editor: Wikidata hits first with no
// persisted id, then corpus units with corpus-local labels de-duplicated
// against the Wikidata ones.
export async function searchUnitCandidates(corpusId: string, search: string, limit: number): Promise<UnitCandidate[]> {
  const [wikidataUnits, corpusUnits] = await Promise.all([
    (async () => {
      try {
        const config = await loadCorpusWikibaseConfig(corpusId)
        if (!config) {
          return []
        }
        return await searchWikibaseUnits(config, search, limit)
      } catch (error) {
        console.error('Wikibase unit search error:', error)
        return []
      }
    })(),
    db.select({ id: unit.id, label: unit.label })
      .from(unit)
      .where(
        and(
          eq(unit.corpusId, corpusId),
          isNull(unit.wikidataId),
          ilike(unit.label, `%${search}%`),
        ),
      )
      .orderBy(sql`levenshtein(${unit.label}, ${search})`)
      .limit(limit)
      .catch((error) => {
        console.error('Corpus unit search error:', error)
        return []
      }),
  ])

  const results: UnitCandidate[] = wikidataUnits.map(unit => ({
    id: null,
    label: unit.label,
    wikidataId: unit.id,
    description: unit.description,
  }))
  const seenLabels = new Set(wikidataUnits.map(unit => unit.label.toLowerCase()))
  for (const candidate of corpusUnits) {
    if (!seenLabels.has(candidate.label.toLowerCase())) {
      results.push({ id: candidate.id, label: candidate.label, wikidataId: null, description: null })
    }
  }
  return results.slice(0, limit * 2)
}
