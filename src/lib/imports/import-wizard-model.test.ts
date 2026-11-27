import { describe, expect, it } from 'vitest'
import { formatForFileName, splitUrlList } from './import-wizard-model'

describe('formatForFileName', () => {
  it.each([
    ['notes.txt', 'text'],
    ['notes.md', 'text'],
    ['notes.markdown', 'text'],
    ['page.html', 'text'],
    ['page.htm', 'text'],
    ['article.wikitext', 'wikitext'],
    ['article.wt', 'wikitext'],
    ['article.mediawiki', 'wikitext'],
    ['article.mw', 'wikitext'],
    ['article.wiki', 'wikitext'],
    ['table.csv', 'csv'],
    ['table.tsv', 'csv'],
    ['crawl.jsonl', 'corpuswalker'],
    ['tasks.json', 'labelstudio'],
    ['archive.zip', 'documents-zip'],
  ])('maps %s to %s', (fileName, expected) => {
    expect(formatForFileName(fileName)).toBe(expected)
  })

  it('is case-insensitive', () => {
    expect(formatForFileName('PAGE.HTML')).toBe('text')
    expect(formatForFileName('CRAWL.JSONL')).toBe('corpuswalker')
    expect(formatForFileName('ARCHIVE.ZIP')).toBe('documents-zip')
  })

  it('defaults .json to labelstudio', () => {
    expect(formatForFileName('export.json')).toBe('labelstudio')
  })

  it('defaults .zip to documents-zip', () => {
    expect(formatForFileName('bundle.zip')).toBe('documents-zip')
  })

  it('returns null for unsupported extensions', () => {
    expect(formatForFileName('scan.pdf')).toBeNull()
    expect(formatForFileName('photo.jpg')).toBeNull()
    expect(formatForFileName('README')).toBeNull()
  })

  it('returns null for macOS metadata files', () => {
    expect(formatForFileName('._archive.zip')).toBeNull()
    expect(formatForFileName('.DS_Store')).toBeNull()
  })
})

describe('splitUrlList', () => {
  it('splits one URL per line', () => {
    expect(splitUrlList('https://a.com/1\nhttps://a.com/2\nhttps://a.com/3')).toEqual([
      'https://a.com/1',
      'https://a.com/2',
      'https://a.com/3',
    ])
  })

  it('trims whitespace around each line', () => {
    expect(splitUrlList('  https://a.com/1  \n\thttps://a.com/2\t')).toEqual([
      'https://a.com/1',
      'https://a.com/2',
    ])
  })

  it('drops empty and blank lines', () => {
    expect(splitUrlList('https://a.com/1\n\n   \nhttps://a.com/2\n')).toEqual([
      'https://a.com/1',
      'https://a.com/2',
    ])
  })

  it('handles CRLF line endings', () => {
    expect(splitUrlList('https://a.com/1\r\nhttps://a.com/2\r\n')).toEqual([
      'https://a.com/1',
      'https://a.com/2',
    ])
  })

  it('returns an empty list for blank input', () => {
    expect(splitUrlList('')).toEqual([])
    expect(splitUrlList('   \n \n')).toEqual([])
  })
})
