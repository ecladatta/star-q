export type CorpusSettings = {
  wikidataConstraintWarnings?: boolean
  wikidataPredicateFiltering?: boolean
  wikibaseInstanceId?: string
}

export type CorpusSettingsPatch = Partial<Omit<CorpusSettings, 'wikibaseInstanceId'>> & {
  wikibaseInstanceId?: string | null
}

const allowedKeys = ['wikidataConstraintWarnings', 'wikidataPredicateFiltering', 'wikibaseInstanceId'] as const

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
      if (value === null || (typeof value === 'string' && UUID_PATTERN.test(value))) {
        result.wikibaseInstanceId = value
        continue
      }
      throw new TypeError('Invalid corpus setting "wikibaseInstanceId": expected a UUID string or null')
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
  const { wikibaseInstanceId, ...rest } = patch
  const merged = { ...(current ?? {}), ...rest }
  if (wikibaseInstanceId === null) {
    delete merged.wikibaseInstanceId
  } else if (wikibaseInstanceId !== undefined) {
    merged.wikibaseInstanceId = wikibaseInstanceId
  }
  return merged
}

export function isConstraintWarningsEnabled(settings: CorpusSettings | undefined): boolean {
  return settings?.wikidataConstraintWarnings ?? false
}

export function isPredicateFilteringEnabled(settings: CorpusSettings | undefined): boolean {
  return settings?.wikidataPredicateFiltering ?? false
}
