import type { DbExecutor } from '@/db/drizzle'
import type { Unit } from '@/db/schema'
import type { UnitRef } from '@/types/types'
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { unit } from '@/db/schema'
import { MAX_CUSTOM_ENTITIES_PER_CORPUS } from '@/lib/constants'

export const WIKIDATA_ID_PATTERN = /^Q\d+$/

// Wikidata units are identified by their Q-id, corpus-local units by label.
export async function findOrCreateUnit(executor: DbExecutor, corpusId: string, unitRef: UnitRef): Promise<string> {
  const isWikidata = !unitRef.custom && WIKIDATA_ID_PATTERN.test(unitRef.value)

  const [result] = await executor.insert(unit).values({
    corpusId,
    label: unitRef.label,
    wikidataId: isWikidata ? unitRef.value : null,
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
  await executor.delete(unit).where(eq(unit.id, id))
}

export async function listCorpusUnits(corpusId: string): Promise<Unit[]> {
  return db.select().from(unit).where(eq(unit.corpusId, corpusId)).orderBy(sql`${unit.wikidataId} IS NOT NULL DESC`, asc(unit.label))
}
