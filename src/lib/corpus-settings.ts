export type CorpusSettings = {
  wikidataConstraintWarnings?: boolean
  wikidataPredicateFiltering?: boolean
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
