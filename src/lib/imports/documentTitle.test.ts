import { describe, expect, it } from 'vitest'
import { documentTitleFromFileName, documentTitleFromUrl } from './documentTitle'

describe('documentTitleFromFileName', () => {
  it('strips the extension', () => {
    expect(documentTitleFromFileName('index.html')).toBe('index')
  })

  it('replaces separators with spaces', () => {
    expect(documentTitleFromFileName('a_long-name.txt')).toBe('a long name')
  })

  it('ignores the directory part', () => {
    expect(documentTitleFromFileName('dir/report.txt')).toBe('report')
  })
})

describe('documentTitleFromUrl', () => {
  it('uses the last non-empty path segment', () => {
    expect(documentTitleFromUrl('https://starwars.fandom.com/wiki/Corellia')).toBe('Corellia')
  })

  it('ignores trailing slashes', () => {
    expect(documentTitleFromUrl('https://starwars.fandom.com/wiki/Corellia/')).toBe('Corellia')
  })

  it('falls back to the hostname when there is no path segment', () => {
    expect(documentTitleFromUrl('https://example.com')).toBe('example.com')
    expect(documentTitleFromUrl('https://example.com/')).toBe('example.com')
  })

  it('replaces hyphens and underscores with spaces', () => {
    expect(documentTitleFromUrl('https://example.com/articles/core_worlds-overview')).toBe('core worlds overview')
  })

  it('percent-decodes the segment', () => {
    expect(documentTitleFromUrl('https://example.com/wiki/Darth%20Vader')).toBe('Darth Vader')
  })

  it('strips the extension like a file import does', () => {
    expect(documentTitleFromUrl('https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore')).toBe('Node')
    expect(documentTitleFromUrl('https://www.rfc-editor.org/rfc/rfc2616.txt')).toBe('rfc2616')
  })

  it('keeps dotfile names', () => {
    expect(documentTitleFromUrl('https://example.com/.gitignore')).toBe('.gitignore')
  })
})
