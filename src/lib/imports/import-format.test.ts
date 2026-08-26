import { describe, expect, it } from 'vitest'
import {
  CORPUS_IMPORT_FORMAT_IDS,
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
  })
})

describe('importFormatAccept', () => {
  it('joins the extensions for the file input accept attribute', () => {
    expect(importFormatAccept('irit-zip')).toBe('.zip')
    expect(importFormatAccept('corpuswalker')).toBe('.jsonl,.json')
  })
})
