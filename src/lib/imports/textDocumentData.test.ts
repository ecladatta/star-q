import type { DocumentData, DocumentExtractionMetadata } from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  buildTextDocumentData,
  isHtmlFileName,
  stripHtml,
} from './textDocumentData'

function singleExtraction(data: DocumentData): DocumentExtractionMetadata {
  const metadata = data._source.extractionMetadata
  return Array.isArray(metadata) ? metadata[0] : metadata
}

describe('buildTextDocumentData', () => {
  it('keeps plain text content as a single text element', () => {
    const data = buildTextDocumentData('intro.txt', 'Hello annotation tool.')
    const extraction = singleExtraction(data)

    expect(data._source.identificationMetadata.id).toBe('intro.txt')
    expect(data._source.identificationMetadata.title).toBe('intro')
    expect(data._source.identificationMetadata.hash).toBe('intro.txt')
    expect(extraction.technology).toBe('text')
    expect(extraction.tables).toEqual([])
    expect(extraction.texts).toEqual([{
      startOffset: 0,
      endOffset: 'Hello annotation tool.'.length,
      value: 'Hello annotation tool.',
    }])
  })

  it('leaves markdown content untouched', () => {
    const markdown = '# Heading\n\nSome **bold** text.'
    const data = buildTextDocumentData('notes.md', markdown)

    expect(singleExtraction(data).texts?.[0].value).toBe(markdown)
  })

  it('strips markup from HTML files', () => {
    const data = buildTextDocumentData('page.html', '<p>Hello <b>world</b></p>')

    expect(singleExtraction(data).texts?.[0].value).toBe('Hello world')
  })

  it('derives the title from the file name without the directory or extension', () => {
    expect(buildTextDocumentData('docs/my_file.md', 'x')._source.identificationMetadata.title).toBe('my file')
    expect(buildTextDocumentData('My File.txt', 'x')._source.identificationMetadata.title).toBe('My File')
  })
})

describe('stripHtml', () => {
  it('removes script and style blocks', () => {
    expect(stripHtml('<script>var x = 1</script>Hello<style>.a{}</style>')).toBe('Hello')
  })

  it('decodes common entities', () => {
    expect(stripHtml('&lt;a&gt; &amp; &quot;b&quot; &nbsp;')).toBe('<a> & "b"')
  })

  it('preserves paragraph breaks between block elements', () => {
    expect(stripHtml('<p>first</p><p>second</p>')).toBe('first\n\nsecond')
  })

  it('does not wrap long lines', () => {
    const longSentence = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(4).trim()
    expect(stripHtml(`<p>${longSentence}</p>`)).toBe(longSentence)
  })
})

describe('isHtmlFileName', () => {
  it('recognizes .html and .htm', () => {
    expect(isHtmlFileName('page.html')).toBe(true)
    expect(isHtmlFileName('page.htm')).toBe(true)
  })

  it('rejects plain text and markdown extensions', () => {
    expect(isHtmlFileName('page.txt')).toBe(false)
    expect(isHtmlFileName('page.md')).toBe(false)
  })
})
