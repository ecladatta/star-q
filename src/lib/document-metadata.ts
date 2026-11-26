import type { DocumentData } from '@/types/types'

export const WIKIBASE_ITEM_ID_PATTERN = /^Q\d+$/

export function normalizeWikidataId(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && WIKIBASE_ITEM_ID_PATTERN.test(trimmed) ? trimmed : null
}

export function normalizeSourceUrls(value: string | string[] | null | undefined): string[] | null {
  const urls = (Array.isArray(value) ? value : value == null ? [] : [value])
    .map(url => url.trim())
    .filter(url => url !== '')
  return urls.length > 0 ? urls : null
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function sourceUrlsEqual(
  a: string | string[] | null | undefined,
  b: string | string[] | null | undefined,
): boolean {
  return JSON.stringify(normalizeSourceUrls(a)) === JSON.stringify(normalizeSourceUrls(b))
}

export function restoredMetadataColumns(
  exported: { wikidataId?: string | null, sourceUrls?: string[] | null, versionDate?: string | null },
  fallback: { wikidataId: string | null, sourceUrls: string[] | null, versionDate: string | null },
): { wikidataId: string | null, sourceUrls: string[] | null, versionDate: string | null } {
  return {
    wikidataId: normalizeWikidataId(exported.wikidataId ?? fallback.wikidataId),
    sourceUrls: exported.sourceUrls ? normalizeSourceUrls(exported.sourceUrls) : fallback.sourceUrls,
    versionDate: exported.versionDate?.trim() || fallback.versionDate,
  }
}

export function metadataColumnsFromDocumentData(data: DocumentData): {
  wikidataId: string | null
  sourceUrls: string[] | null
  versionDate: string | null
} {
  const meta = data._source?.identificationMetadata
  return {
    wikidataId: normalizeWikidataId(meta?.wikidata),
    sourceUrls: normalizeSourceUrls(meta?.url),
    versionDate: meta?.versionDate?.trim() || null,
  }
}
