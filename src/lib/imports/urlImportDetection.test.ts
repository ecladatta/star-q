import { describe, expect, it } from 'vitest'
import { detectUrlImportFormat, isHtmlMediaType } from './urlImportDetection'

describe('isHtmlMediaType', () => {
  it('treats an empty media type as html', () => {
    expect(isHtmlMediaType('')).toBe(true)
  })

  it('recognizes html and xhtml', () => {
    expect(isHtmlMediaType('text/html')).toBe(true)
    expect(isHtmlMediaType('application/xhtml+xml')).toBe(true)
    expect(isHtmlMediaType('text/plain')).toBe(false)
  })
})

describe('detectUrlImportFormat', () => {
  it('imports html and unknown media types as web pages', () => {
    expect(detectUrlImportFormat('text/html', 'https://example.com/a', '<p>hi</p>')).toBe('text')
    expect(detectUrlImportFormat('', 'https://example.com/a', '<p>hi</p>')).toBe('text')
  })

  it('imports text/csv as a table', () => {
    expect(detectUrlImportFormat('text/csv', 'https://example.com/data', 'a,b\n1,2')).toBe('csv')
  })

  it('detects a Label Studio task array', () => {
    const content = JSON.stringify([{ id: 1, data: { text: 'hello' } }])
    expect(detectUrlImportFormat('application/json', 'https://example.com/tasks.json', content)).toBe('labelstudio')
    expect(detectUrlImportFormat('text/plain', 'https://example.com/tasks', content)).toBe('labelstudio')
  })

  it('detects a STAR-Q corpus export', () => {
    const content = JSON.stringify({ exportMeta: { version: '1.4', type: 'full-corpus-export' }, documents: [] })
    expect(detectUrlImportFormat('application/json', 'https://example.com/export.json', content)).toBe('full-corpus-export')
  })

  it('detects CorpusWalker JSONL served as text', () => {
    const content = `${JSON.stringify({ _index: 0, _source: { identificationMetadata: { id: 'a' } } })
    }\n${JSON.stringify({ _index: 1, _source: { identificationMetadata: { id: 'b' } } })}`
    expect(detectUrlImportFormat('text/plain', 'https://example.com/crawl.jsonl', content)).toBe('corpuswalker')
    expect(detectUrlImportFormat('application/json', 'https://example.com/crawl', content)).toBe('corpuswalker')
  })

  it('detects csv and wikitext plain text by the URL extension', () => {
    expect(detectUrlImportFormat('text/plain', 'https://example.com/data.csv', 'a,b\n1,2')).toBe('csv')
    expect(detectUrlImportFormat('text/plain', 'https://example.com/data.tsv', 'a\tb')).toBe('csv')
    expect(detectUrlImportFormat('text/plain', 'https://example.com/page.wikitext', '==Title==')).toBe('wikitext')
  })

  it('falls back to a plain text document', () => {
    expect(detectUrlImportFormat('text/plain', 'https://example.com/readme.txt', 'just text')).toBe('text')
    expect(detectUrlImportFormat('text/plain', 'https://www.rfc-editor.org/rfc/rfc2616.txt', 'RFC 2616')).toBe('text')
  })

  it('rejects JSON it cannot recognize', () => {
    const content = JSON.stringify({ name: 'star-q', version: '0.1.0' })
    expect(() => detectUrlImportFormat('application/json', 'https://example.com/pkg.json', content))
      .toThrow('The URL did not return a recognized JSON format.')
  })

  it('rejects unsupported media types', () => {
    expect(() => detectUrlImportFormat('application/zip', 'https://example.com/a.zip', ''))
      .toThrow('not supported')
    expect(() => detectUrlImportFormat('image/png', 'https://example.com/a.png', ''))
      .toThrow('not supported')
  })
})
