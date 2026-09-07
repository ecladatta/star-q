import type { WikibaseConfig } from './wikibase'
import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { corpus, wikibaseInstances } from '@/db/schema'
import { resolveWikibase } from './wikibase'

export async function loadCorpusWikibaseConfig(corpusId: string): Promise<WikibaseConfig> {
  const [row] = await db
    .select({ settings: corpus.settings })
    .from(corpus)
    .where(eq(corpus.id, corpusId))
    .limit(1)
  const settings = row?.settings
  if (!settings?.wikibaseInstanceId) {
    return resolveWikibase(settings, null)
  }
  const [entry] = await db
    .select()
    .from(wikibaseInstances)
    .where(eq(wikibaseInstances.id, settings.wikibaseInstanceId))
    .limit(1)
  return resolveWikibase(settings, entry)
}
