import { describe, expect, it } from 'vitest'
import { isFullCorpusExport } from './fullCorpusExport'

describe('isFullCorpusExport', () => {
  it('accepts a valid corpus export', () => {
    expect(isFullCorpusExport({
      exportMeta: { version: '1.3', type: 'full-corpus-export' },
      id: 'x',
      title: 't',
      documents: [],
      customEntities: [],
    })).toBe(true)
  })

  it('rejects non-object values', () => {
    expect(isFullCorpusExport(null)).toBe(false)
    expect(isFullCorpusExport([])).toBe(false)
    expect(isFullCorpusExport('string')).toBe(false)
  })

  it('rejects exports with a non-export exportMeta type', () => {
    expect(isFullCorpusExport({ exportMeta: { type: 'other' }, documents: [] })).toBe(false)
  })

  it('rejects exports without a documents array', () => {
    expect(isFullCorpusExport({ exportMeta: { type: 'full-corpus-export' } })).toBe(false)
  })
})
