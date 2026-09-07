import { expect, it } from 'vitest'
import {
  isConstraintWarningsEnabled,
  isPredicateFilteringEnabled,
  mergeCorpusSettings,
  sanitizeCorpusSettingsPatch,
  WIKIBASE_INSTANCE_NONE,
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

it('accepts a UUID for wikibaseInstanceId', () => {
  expect(sanitizeCorpusSettingsPatch({ wikibaseInstanceId: '123e4567-e89b-12d3-a456-426614174000' }))
    .toEqual({ wikibaseInstanceId: '123e4567-e89b-12d3-a456-426614174000' })
})

it('accepts the none sentinel for wikibaseInstanceId', () => {
  expect(sanitizeCorpusSettingsPatch({ wikibaseInstanceId: WIKIBASE_INSTANCE_NONE }))
    .toEqual({ wikibaseInstanceId: 'none' })
})

it('rejects a non-UUID string for wikibaseInstanceId', () => {
  expect(() => sanitizeCorpusSettingsPatch({ wikibaseInstanceId: 'not-a-uuid' }))
    .toThrow('Invalid corpus setting "wikibaseInstanceId": expected \'none\', a UUID string, or null')
  expect(() => sanitizeCorpusSettingsPatch({ wikibaseInstanceId: '' }))
    .toThrow('Invalid corpus setting "wikibaseInstanceId": expected \'none\', a UUID string, or null')
})

it('rejects a number for wikibaseInstanceId', () => {
  expect(() => sanitizeCorpusSettingsPatch({ wikibaseInstanceId: 42 as unknown as string }))
    .toThrow('Invalid corpus setting "wikibaseInstanceId": expected \'none\', a UUID string, or null')
})

it('passes null through as an explicit clear', () => {
  expect(sanitizeCorpusSettingsPatch({ wikibaseInstanceId: null }))
    .toEqual({ wikibaseInstanceId: null })
})

it('treats an explicit undefined for wikibaseInstanceId as no change', () => {
  expect(sanitizeCorpusSettingsPatch({ wikibaseInstanceId: undefined }))
    .toEqual({})
})

it('removes wikibaseInstanceId from the merged settings on a null patch value', () => {
  const merged = mergeCorpusSettings(
    { wikibaseInstanceId: '123e4567-e89b-12d3-a456-426614174000', wikidataConstraintWarnings: true },
    { wikibaseInstanceId: null },
  )
  expect(merged).toEqual({ wikidataConstraintWarnings: true })
  expect(merged).not.toHaveProperty('wikibaseInstanceId')
})

it('overwrites a previous uuid selection with the none sentinel', () => {
  expect(
    mergeCorpusSettings(
      { wikibaseInstanceId: '123e4567-e89b-12d3-a456-426614174000' },
      { wikibaseInstanceId: WIKIBASE_INSTANCE_NONE },
    ),
  ).toEqual({ wikibaseInstanceId: 'none' })
})

it('keeps wikibaseInstanceId when the patch does not mention it', () => {
  expect(
    mergeCorpusSettings(
      { wikibaseInstanceId: '123e4567-e89b-12d3-a456-426614174000' },
      { wikidataConstraintWarnings: true },
    ),
  ).toEqual({ wikibaseInstanceId: '123e4567-e89b-12d3-a456-426614174000', wikidataConstraintWarnings: true })
})
