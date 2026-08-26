import { describe, expect, it } from 'vitest'
import {
  classifyDocumentFile,
  DOCUMENT_FILE_EXTENSIONS,
  fileExtension,
} from './documentFileClassifier'

describe('fileExtension', () => {
  it('returns the lowercased extension', () => {
    expect(fileExtension('doc.TXT')).toBe('.txt')
    expect(fileExtension('notes.md')).toBe('.md')
  })

  it('returns an empty string when there is no extension', () => {
    expect(fileExtension('README')).toBe('')
  })

  it('ignores the directory part', () => {
    expect(fileExtension('folder/sub/report.csv')).toBe('.csv')
  })
})

describe('classifyDocumentFile', () => {
  it('classifies text extensions as text', () => {
    for (const name of ['a.txt', 'b.md', 'c.markdown', 'd.html', 'e.htm']) {
      expect(classifyDocumentFile(name)).toBe('text')
    }
  })

  it('classifies CSV and TSV extensions as table', () => {
    expect(classifyDocumentFile('data.csv')).toBe('table')
    expect(classifyDocumentFile('data.tsv')).toBe('table')
  })

  it('returns null for unsupported files', () => {
    expect(classifyDocumentFile('image.png')).toBeNull()
    expect(classifyDocumentFile('notes.docx')).toBeNull()
    expect(classifyDocumentFile('README')).toBeNull()
  })

  it('ignores macOS archive metadata', () => {
    expect(classifyDocumentFile('__MACOSX/._a.txt')).toBeNull()
    expect(classifyDocumentFile('._notes.md')).toBeNull()
    expect(classifyDocumentFile('.DS_Store')).toBeNull()
  })

  it('lists every supported extension', () => {
    expect(DOCUMENT_FILE_EXTENSIONS).toContain('.txt')
    expect(DOCUMENT_FILE_EXTENSIONS).toContain('.html')
    expect(DOCUMENT_FILE_EXTENSIONS).toContain('.csv')
    expect(DOCUMENT_FILE_EXTENSIONS).toContain('.tsv')
  })
})
