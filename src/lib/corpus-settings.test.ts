import { expect, it } from 'vitest'
import {
  isConstraintWarningsEnabled,
  isPredicateFilteringEnabled,
  mergeCorpusSettings,
  sanitizeCorpusSettingsPatch,
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

it('keeps only allowed keys from a valid boolean patch', () => {
  const result = sanitizeCorpusSettingsPatch({
    wikidataConstraintWarnings: true,
    wikidataPredicateFiltering: false,
  })
  expect(result).toEqual({
    wikidataConstraintWarnings: true,
    wikidataPredicateFiltering: false,
  })
})

it('throws on a non-boolean value for an allowed key', () => {
  expect(() =>
    sanitizeCorpusSettingsPatch({ wikidataPredicateFiltering: 'yes' as unknown as boolean }),
  ).toThrow('Invalid corpus setting "wikidataPredicateFiltering": expected boolean')
})

it('drops unknown keys that are not in the whitelist', () => {
  const result = sanitizeCorpusSettingsPatch({
    wikidataConstraintWarnings: true,
    someUnknownKey: 'nope',
  } as unknown as Parameters<typeof sanitizeCorpusSettingsPatch>[0])
  expect(result).toEqual({ wikidataConstraintWarnings: true })
})
