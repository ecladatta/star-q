import type { DocumentData, DocumentExport } from '@/types/types'

export const WIKIBASE_ITEM_ID_PATTERN = /^Q\d+$/

export function normalizeWikidataId(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed && WIKIBASE_ITEM_ID_PATTERN.test(trimmed) ? trimmed : null
}

export const WIKIBASE_PROPERTY_ID_PATTERN = /^P\d+$/

export function normalizePropertyId(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed && WIKIBASE_PROPERTY_ID_PATTERN.test(trimmed) ? trimmed : null
}

export function normalizeVersionDate(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null
}

export function normalizeSourceUrls(value: unknown): string[] | null {
  const urls = (typeof value === 'string'
    ? [value]
    : Array.isArray(value) ? value : []
  ).map(url => (typeof url === 'string' ? url.trim() : '')).filter(url => url !== '')
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

export function sourceUrlsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizeSourceUrls(a)) === JSON.stringify(normalizeSourceUrls(b))
}

export function restoredMetadataColumns(
  exported: Partial<Pick<DocumentExport, 'wikidataId' | 'sourceUrls' | 'versionDate'>>,
  fallback: { wikidataId: string | null, sourceUrls: string[] | null, versionDate: string | null },
): { wikidataId: string | null, sourceUrls: string[] | null, versionDate: string | null } {
  return {
    wikidataId: exported.wikidataId === undefined ? fallback.wikidataId : normalizeWikidataId(exported.wikidataId),
    sourceUrls: exported.sourceUrls === undefined ? fallback.sourceUrls : normalizeSourceUrls(exported.sourceUrls),
    versionDate: exported.versionDate === undefined ? fallback.versionDate : normalizeVersionDate(exported.versionDate),
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
    versionDate: normalizeVersionDate(meta?.versionDate),
  }
}
