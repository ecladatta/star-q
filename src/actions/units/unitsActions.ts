'use server'
import type { Unit } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db/drizzle'
import { unit } from '@/db/schema'
import { NotFoundError } from '@/lib/auth-utils'
import { requireEditCorpus, requireViewCorpus } from '@/lib/corpus-access'
import { createCorpusUnit, deleteCorpusUnit, listCorpusUnits, updateCorpusUnit } from '@/lib/units/server'

export async function createUnit(corpusId: string, label: string): Promise<Unit> {
  await requireEditCorpus(corpusId)

  const result = await createCorpusUnit(db, corpusId, label)
  revalidatePath(`/corpus/${corpusId}`)
  return result
}

export async function updateUnit(id: string, label: string): Promise<void> {
  const corpusId = await requireEditableUnit(id)

  await updateCorpusUnit(db, id, label)
  revalidatePath(`/corpus/${corpusId}`)
}

export async function deleteUnit(id: string): Promise<void> {
  const corpusId = await requireEditableUnit(id)

  await deleteCorpusUnit(db, id)
  revalidatePath(`/corpus/${corpusId}`)
}

export async function listUnits(corpusId: string): Promise<Array<Unit & { usageCount: number }>> {
  await requireViewCorpus(corpusId)

  return listCorpusUnits(corpusId)
}

// Units live in their own table, so resolve the corpus here the way
// requireEditCustomEntity does for corpus custom entities.
async function requireEditableUnit(id: string): Promise<string> {
  const [row] = await db.select({ corpusId: unit.corpusId }).from(unit).where(eq(unit.id, id)).limit(1)
  if (!row) {
    throw new NotFoundError()
  }
  await requireEditCorpus(row.corpusId)
  return row.corpusId
}
