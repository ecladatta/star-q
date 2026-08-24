export type CorpusSettings = {
  wikidataConstraintWarnings?: boolean
  wikidataPredicateFiltering?: boolean
}

const allowedKeys = ['wikidataConstraintWarnings', 'wikidataPredicateFiltering'] as const

export function sanitizeCorpusSettingsPatch(patch: Partial<CorpusSettings>): Partial<CorpusSettings> {
  return Object.fromEntries(
    allowedKeys.flatMap((key) => {
      if (!(key in patch)) {
        return []
      }
      const value = patch[key]
      if (typeof value !== 'boolean') {
        throw new TypeError(`Invalid corpus setting "${key}": expected boolean`)
      }
      return [[key, value]]
    }),
  )
}

export function mergeCorpusSettings(
  current: CorpusSettings | undefined,
  patch: Partial<CorpusSettings>,
): CorpusSettings {
  return { ...(current ?? {}), ...patch }
}

export function isConstraintWarningsEnabled(settings: CorpusSettings | undefined): boolean {
  return settings?.wikidataConstraintWarnings ?? false
}

export function isPredicateFilteringEnabled(settings: CorpusSettings | undefined): boolean {
  return settings?.wikidataPredicateFiltering ?? false
}
