import type { ResolvedWikibase } from './wikibase'
import { and, eq } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/db/drizzle'
import { corpus, wikibaseInstances } from '@/db/schema'
import { WIKIBASE_INSTANCE_NONE } from './corpus-settings'
import { resolveWikibase } from './wikibase'

export const loadCorpusWikibaseConfig = cache(async (corpusId: string): Promise<ResolvedWikibase | null> => {
  const [row] = await db
    .select({ settings: corpus.settings })
    .from(corpus)
    .where(eq(corpus.id, corpusId))
    .limit(1)
  const settings = row?.settings
  if (settings?.wikibaseInstanceId === WIKIBASE_INSTANCE_NONE) {
    return null
  }
  if (settings?.wikibaseInstanceId) {
    const [entry] = await db
      .select()
      .from(wikibaseInstances)
      .where(eq(wikibaseInstances.id, settings.wikibaseInstanceId))
      .limit(1)
    return resolveWikibase(settings, entry)
  }
  const [entry] = await db
    .select()
    .from(wikibaseInstances)
    .where(and(eq(wikibaseInstances.isDefault, true), eq(wikibaseInstances.enabled, true)))
    .limit(1)
  if (!entry) {
    return null
  }
  return { label: entry.label, instance: entry.instanceUrl, sparqlEndpoint: entry.sparqlEndpoint }
})
