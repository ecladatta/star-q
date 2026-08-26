import { describe, expect, it } from 'vitest'
import { documentTitleFromFileName } from './documentTitle'

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
