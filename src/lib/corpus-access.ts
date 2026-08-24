import { eq } from 'drizzle-orm'
import { isAuthEnabled } from '@/auth.config'
import { db } from '@/db/drizzle'
import { corpus, document } from '@/db/schema'
import { getOptionalUserId, isApiKeyAuthenticated, NotFoundError } from '@/lib/auth-utils'

/**
 * Whether the current caller has full read access: a signed-in session or a
 * valid API key. Both are treated identically for access-control purposes.
 * Returns true when auth is disabled (no login is required).
 */
async function isFullAccess(): Promise<boolean> {
  if (!isAuthEnabled()) {
    return true
  }
  if (await isApiKeyAuthenticated()) {
    return true
  }
  return (await getOptionalUserId()) !== null
}

/**
 * Whether the current caller is an anonymous viewer under auth.
 * Returns false when auth is disabled (no login is required).
 */
export async function isAnonymousViewer(): Promise<boolean> {
  return !(await isFullAccess())
}

/**
 * Whether the current caller may edit content. Edit access equals
 * authenticated when auth is enabled, and is always allowed when disabled.
 */
export async function canEdit(): Promise<boolean> {
  return await isFullAccess()
}

/**
 * Requires read access to a corpus. Authenticated and API-key callers may
 * always read. Anonymous callers may read only when the corpus is public.
 * Returns the user ID when authenticated, null otherwise (API key, auth
 * disabled, or public read).
 * Does not throw for a missing corpus, so callers keep their own 404 handling.
 * A private corpus is indistinguishable from a missing one for anonymous
 * callers: both surface as 404.
 */
export async function requireViewCorpus(corpusId: string): Promise<string | null> {
  if (await isFullAccess()) {
    return await getOptionalUserId()
  }

  const [row] = await db
    .select({ visibility: corpus.visibility })
    .from(corpus)
    .where(eq(corpus.id, corpusId))
  if (!row) {
    return null
  }
  if (row.visibility === 'public') {
    return null
  }
  throw new NotFoundError()
}

/**
 * Requires read access to a document by resolving it to its corpus.
 * Returns the user ID when authenticated, null otherwise (API key, auth
 * disabled, or public read).
 * Does not throw for a missing document, so callers keep their own 404 handling.
 * A document in a private corpus is indistinguishable from a missing one for
 * anonymous callers: both surface as 404.
 */
export async function requireViewDocument(documentId: string): Promise<string | null> {
  if (await isFullAccess()) {
    return await getOptionalUserId()
  }

  const [row] = await db
    .select({ visibility: corpus.visibility })
    .from(document)
    .innerJoin(corpus, eq(corpus.id, document.corpusId))
    .where(eq(document.id, documentId))
  if (!row) {
    return null
  }
  if (row.visibility === 'public') {
    return null
  }
  throw new NotFoundError()
}
