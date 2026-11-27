import type { CorpusImportFormat } from './import-format'
import { describe, expect, it } from 'vitest'
import {
  CORPUS_IMPORT_FORMAT_IDS,
  CORPUS_IMPORT_FORMATS,
  DEFAULT_FORMAT_BY_EXTENSION,
  importFormatAccept,
  importFormatLabel,
  isCorpusImportFormat,
} from './import-format'

describe('isCorpusImportFormat', () => {
  it('accepts every registered format id', () => {
    for (const id of CORPUS_IMPORT_FORMAT_IDS) {
      expect(isCorpusImportFormat(id)).toBe(true)
    }
  })

  it('rejects unknown values', () => {
    expect(isCorpusImportFormat('unknown')).toBe(false)
    expect(isCorpusImportFormat('')).toBe(false)
    expect(isCorpusImportFormat('JSON')).toBe(false)
    expect(isCorpusImportFormat(null)).toBe(false)
    expect(isCorpusImportFormat(undefined)).toBe(false)
    expect(isCorpusImportFormat(42)).toBe(false)
  })
})

describe('importFormatLabel', () => {
  it('includes the accepted extensions in the label', () => {
    expect(importFormatLabel('corpuswalker')).toContain('.jsonl')
    expect(importFormatLabel('irit-zip')).toContain('.zip')
    expect(importFormatLabel('wikitext')).toContain('.wikitext')
  })

  it('registers the wikitext format', () => {
    expect(CORPUS_IMPORT_FORMATS.wikitext.label).toBe('Wikitext / MediaWiki')
    expect(CORPUS_IMPORT_FORMATS.wikitext.extensions).toEqual([
      '.wikitext',
      '.wt',
      '.mediawiki',
      '.mw',
      '.wiki',
    ])
  })
})

describe('default format by extension', () => {
  const claimants = new Map<string, CorpusImportFormat[]>()
  for (const format of CORPUS_IMPORT_FORMAT_IDS) {
    for (const extension of CORPUS_IMPORT_FORMATS[format].extensions) {
      claimants.set(extension, [...claimants.get(extension) ?? [], format])
    }
  }

  it('resolves each default to a format that claims the extension', () => {
    for (const [extension, format] of Object.entries(DEFAULT_FORMAT_BY_EXTENSION)) {
      expect(claimants.get(extension), `no format claims ${extension}`).toContain(format)
    }
  })

  it('gives every contested extension a default', () => {
    for (const [extension, formats] of claimants) {
      if (formats.length > 1) {
        expect(Object.keys(DEFAULT_FORMAT_BY_EXTENSION), `${extension} is claimed by ${formats.join(', ')}`)
          .toContain(extension)
      }
    }
  })
})

describe('importFormatAccept', () => {
  it('joins the extensions for the file input accept attribute', () => {
    expect(importFormatAccept('irit-zip')).toBe('.zip')
    expect(importFormatAccept('corpuswalker')).toBe('.jsonl,.json')
    expect(importFormatAccept('wikitext')).toBe('.wikitext,.wt,.mediawiki,.mw,.wiki')
  })
})
