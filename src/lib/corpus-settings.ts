import { normalizeWikidataId } from './document-metadata'

export type CorpusSettings = {
  wikibaseConstraintWarnings?: boolean
  wikibasePredicateFiltering?: boolean
  wikibaseInstanceId?: string
  statedInItemId?: string
}

export type CorpusSettingsPatch = Partial<Omit<CorpusSettings, 'wikibaseInstanceId' | 'statedInItemId'>> & {
  wikibaseInstanceId?: string | null
  statedInItemId?: string | null
}

export const WIKIBASE_INSTANCE_NONE = 'none'

const allowedKeys = ['wikibaseConstraintWarnings', 'wikibasePredicateFiltering', 'wikibaseInstanceId', 'statedInItemId'] as const

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function sanitizeCorpusSettingsPatch(patch: CorpusSettingsPatch): CorpusSettingsPatch {
  const result: CorpusSettingsPatch = {}
  for (const key of allowedKeys) {
    if (!(key in patch)) {
      continue
    }
    const value = patch[key]
    if (key === 'wikibaseInstanceId') {
      if (value === undefined) {
        continue
      }
      if (value === null || value === WIKIBASE_INSTANCE_NONE || (typeof value === 'string' && UUID_PATTERN.test(value))) {
        result.wikibaseInstanceId = value
        continue
      }
      throw new TypeError('Invalid corpus setting "wikibaseInstanceId": expected \'none\', a UUID string, or null')
    }
    if (key === 'statedInItemId') {
      if (value === undefined) {
        continue
      }
      if (value === null) {
        result.statedInItemId = null
        continue
      }
      const normalized = normalizeWikidataId(value)
      if (!normalized) {
        throw new TypeError('Invalid corpus setting "statedInItemId": expected a Wikibase item ID or null')
      }
      result.statedInItemId = normalized
      continue
    }
    if (typeof value !== 'boolean') {
      throw new TypeError(`Invalid corpus setting "${key}": expected boolean`)
    }
    result[key] = value
  }
  return result
}

export function mergeCorpusSettings(
  current: CorpusSettings | undefined,
  patch: CorpusSettingsPatch,
): CorpusSettings {
  const merged = { ...(current ?? {}) }
  for (const key of ['wikibaseConstraintWarnings', 'wikibasePredicateFiltering'] as const) {
    if (patch[key] !== undefined) {
      merged[key] = patch[key]
    }
  }
  for (const key of ['wikibaseInstanceId', 'statedInItemId'] as const) {
    const value = patch[key]
    if (value === undefined) {
      continue
    }
    if (value === null) {
      delete merged[key]
    } else {
      merged[key] = value
    }
  }
  return merged
}

export function isConstraintWarningsEnabled(settings: CorpusSettings | undefined): boolean {
  return settings?.wikibaseConstraintWarnings ?? false
}

export function isPredicateFilteringEnabled(settings: CorpusSettings | undefined): boolean {
  return settings?.wikibasePredicateFiltering ?? false
}
