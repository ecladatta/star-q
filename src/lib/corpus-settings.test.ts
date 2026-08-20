import { expect, it } from 'vitest'
import {
  isConstraintWarningsEnabled,
  isPredicateFilteringEnabled,
  mergeCorpusSettings,
} from './corpus-settings'

it('merges a partial patch without clobbering other settings', () => {
  expect(mergeCorpusSettings({ wikidataConstraintWarnings: true }, { wikidataPredicateFiltering: true }))
    .toEqual({ wikidataConstraintWarnings: true, wikidataPredicateFiltering: true })
})

it('merges from undefined current settings', () => {
  expect(mergeCorpusSettings(undefined, { wikidataConstraintWarnings: true }))
    .toEqual({ wikidataConstraintWarnings: true })
})

it('treats missing settings as disabled by default', () => {
  expect(isConstraintWarningsEnabled(undefined)).toBe(false)
  expect(isConstraintWarningsEnabled({})).toBe(false)
  expect(isPredicateFilteringEnabled(undefined)).toBe(false)
})

it('reflects explicitly enabled settings', () => {
  expect(isConstraintWarningsEnabled({ wikidataConstraintWarnings: true })).toBe(true)
  expect(isPredicateFilteringEnabled({ wikidataPredicateFiltering: true })).toBe(true)
})
