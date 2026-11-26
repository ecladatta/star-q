import type { DocumentData } from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  isValidHttpUrl,
  metadataColumnsFromDocumentData,
  normalizeSourceUrls,
  normalizeVersionDate,
  normalizeWikidataId,
  restoredMetadataColumns,
  sourceUrlsEqual,
} from './document-metadata'

describe('normalizeWikidataId', () => {
  it('accepts valid Q-ids and trims whitespace', () => {
    expect(normalizeWikidataId('Q123')).toBe('Q123')
    expect(normalizeWikidataId('  Q11573 ')).toBe('Q11573')
    expect(normalizeWikidataId('Q0')).toBe('Q0')
  })

  it('rejects empty, blank and malformed values', () => {
    expect(normalizeWikidataId('')).toBeNull()
    expect(normalizeWikidataId('   ')).toBeNull()
    expect(normalizeWikidataId('q123')).toBeNull()
    expect(normalizeWikidataId('Q12a')).toBeNull()
    expect(normalizeWikidataId('P123')).toBeNull()
    expect(normalizeWikidataId('123')).toBeNull()
    expect(normalizeWikidataId(null)).toBeNull()
    expect(normalizeWikidataId(undefined)).toBeNull()
  })

  it('treats non-string values as absent', () => {
    expect(normalizeWikidataId(42)).toBeNull()
    expect(normalizeWikidataId({})).toBeNull()
  })
})

describe('normalizeVersionDate', () => {
  it('trims present values and nulls blank ones', () => {
    expect(normalizeVersionDate(' 2024-01-01 ')).toBe('2024-01-01')
    expect(normalizeVersionDate('2024-01-01')).toBe('2024-01-01')
    expect(normalizeVersionDate('')).toBeNull()
    expect(normalizeVersionDate('   ')).toBeNull()
    expect(normalizeVersionDate(null)).toBeNull()
    expect(normalizeVersionDate(undefined)).toBeNull()
  })

  it('treats non-string values as absent', () => {
    expect(normalizeVersionDate(42)).toBeNull()
    expect(normalizeVersionDate({})).toBeNull()
  })
})

describe('normalizeSourceUrls', () => {
  it('wraps a single string into an array', () => {
    expect(normalizeSourceUrls('https://example.org')).toEqual(['https://example.org'])
  })

  it('trims entries and drops blank ones', () => {
    expect(normalizeSourceUrls([' https://a.example ', '', 'https://b.example', '   ']))
      .toEqual(['https://a.example', 'https://b.example'])
  })

  it('returns null when nothing usable remains', () => {
    expect(normalizeSourceUrls([])).toBeNull()
    expect(normalizeSourceUrls(['', '   '])).toBeNull()
    expect(normalizeSourceUrls('')).toBeNull()
    expect(normalizeSourceUrls('   ')).toBeNull()
    expect(normalizeSourceUrls(null)).toBeNull()
    expect(normalizeSourceUrls(undefined)).toBeNull()
  })

  it('wraps a single string and treats non-string values as absent', () => {
    expect(normalizeSourceUrls(42)).toBeNull()
    expect(normalizeSourceUrls({})).toBeNull()
    expect(normalizeSourceUrls([42, 'https://a.example'])).toEqual(['https://a.example'])
  })
})

describe('isValidHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isValidHttpUrl('https://example.org/page')).toBe(true)
    expect(isValidHttpUrl('http://example.org')).toBe(true)
  })

  it('rejects other protocols and garbage', () => {
    expect(isValidHttpUrl('ftp://example.org')).toBe(false)
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isValidHttpUrl('example.org')).toBe(false)
    expect(isValidHttpUrl('')).toBe(false)
  })
})

describe('sourceUrlsEqual', () => {
  it('ignores trimming, blank entries and empty lists', () => {
    expect(sourceUrlsEqual([' https://a.example ', ''], ['https://a.example'])).toBe(true)
    expect(sourceUrlsEqual([], null)).toBe(true)
    expect(sourceUrlsEqual(['  '], undefined)).toBe(true)
    expect(sourceUrlsEqual('https://a.example', ['https://a.example'])).toBe(true)
  })

  it('distinguishes different urls and different order', () => {
    expect(sourceUrlsEqual(['https://a.example'], ['https://b.example'])).toBe(false)
    expect(sourceUrlsEqual(['https://a.example', 'https://b.example'], ['https://b.example', 'https://a.example'])).toBe(false)
    expect(sourceUrlsEqual(['https://a.example'], null)).toBe(false)
  })
})

describe('restoredMetadataColumns', () => {
  const fallback = { wikidataId: 'Q7099', sourceUrls: ['https://raw.example'], versionDate: '2024-01-01' }

  it('prefers the export columns when present', () => {
    expect(restoredMetadataColumns({
      wikidataId: 'Q42',
      sourceUrls: ['https://export.example'],
      versionDate: '2025-06-01',
    }, fallback)).toEqual({ wikidataId: 'Q42', sourceUrls: ['https://export.example'], versionDate: '2025-06-01' })
  })

  it('falls back to raw-derived values only for fields the export omits', () => {
    expect(restoredMetadataColumns({}, fallback)).toEqual(fallback)
    expect(restoredMetadataColumns({ wikidataId: 'Q11573' }, fallback))
      .toEqual({ wikidataId: 'Q11573', sourceUrls: ['https://raw.example'], versionDate: '2024-01-01' })
  })

  it('lets explicitly cleared fields survive re-import instead of resurrecting from raw', () => {
    expect(restoredMetadataColumns({ wikidataId: null, sourceUrls: null, versionDate: null }, fallback))
      .toEqual({ wikidataId: null, sourceUrls: null, versionDate: null })
    expect(restoredMetadataColumns({ sourceUrls: [] }, fallback))
      .toEqual({ wikidataId: 'Q7099', sourceUrls: null, versionDate: '2024-01-01' })
  })

  it('normalizes present values and treats wrong-typed ones as cleared', () => {
    expect(restoredMetadataColumns(
      { wikidataId: ' Q11573 ', sourceUrls: [' https://x.example ', ''], versionDate: ' 2025-06-01 ' },
      fallback,
    )).toEqual({ wikidataId: 'Q11573', sourceUrls: ['https://x.example'], versionDate: '2025-06-01' })
    expect(restoredMetadataColumns(
      { wikidataId: 42 as unknown as string | null, sourceUrls: 42 as unknown as string[] | null },
      fallback,
    )).toEqual({ wikidataId: null, sourceUrls: null, versionDate: '2024-01-01' })
  })
})

describe('metadataColumnsFromDocumentData', () => {
  function documentData(identificationMetadata: Partial<DocumentData['_source']['identificationMetadata']>): DocumentData {
    return {
      _source: {
        identificationMetadata: identificationMetadata as DocumentData['_source']['identificationMetadata'],
        extractionMetadata: [],
      },
    }
  }

  it('derives all three columns from full metadata', () => {
    expect(metadataColumnsFromDocumentData(documentData({
      id: 'x',
      versionDate: '2024-02-01',
      hash: 'h',
      wikidata: 'Q7099',
      url: 'https://fr.wikipedia.org/wiki/Emmy_Noether',
    }))).toEqual({
      wikidataId: 'Q7099',
      sourceUrls: ['https://fr.wikipedia.org/wiki/Emmy_Noether'],
      versionDate: '2024-02-01',
    })
  })

  it('normalizes and blanks missing or invalid metadata', () => {
    expect(metadataColumnsFromDocumentData(documentData({
      id: 'x',
      versionDate: '  ',
      hash: 'h',
      wikidata: 'not-a-qid',
      url: [],
    }))).toEqual({
      wikidataId: null,
      sourceUrls: null,
      versionDate: null,
    })
  })

  it('returns nulls when the metadata is absent', () => {
    expect(metadataColumnsFromDocumentData(documentData({ id: 'x', versionDate: '', hash: 'h' })))
      .toEqual({ wikidataId: null, sourceUrls: null, versionDate: null })
  })
})
