import type { DocumentData, DocumentExtractionMetadata } from '@/types/types'
import { describe, expect, it } from 'vitest'
import {
  buildTextDocumentData,
  buildUrlDocumentData,
  isHtmlFileName,
  stripHtml,
} from './textDocumentData'

function singleExtraction(data: DocumentData): DocumentExtractionMetadata {
  const metadata = data._source.extractionMetadata
  return Array.isArray(metadata) ? metadata[0] : metadata
}

describe('buildTextDocumentData', () => {
  it('keeps plain text content as a single text element', async () => {
    const { data, warnings } = await buildTextDocumentData('intro.txt', 'Hello annotation tool.')
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
    expect(warnings).toEqual([])
  })

  it('leaves markdown content untouched', async () => {
    const markdown = '# Heading\n\nSome **bold** text.'
    const { data, warnings } = await buildTextDocumentData('notes.md', markdown)

    expect(singleExtraction(data).texts?.[0].value).toBe(markdown)
    expect(warnings).toEqual([])
  })

  it('strips markup from HTML files', async () => {
    const { data, warnings } = await buildTextDocumentData('page.html', '<p>Hello <b>world</b></p>')

    expect(singleExtraction(data).texts?.[0].value).toBe('Hello world')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('page.html')
  })

  it('extracts the article content from a page with boilerplate', async () => {
    const html = `
      <html>
        <head><title>Article Heading - Example Site</title></head>
        <body>
          <nav><a href="/">Home</a> <a href="/about">About</a> <a href="/contact">Contact</a></nav>
          <main>
            <article>
              <h1>Article Heading</h1>
              <p>First paragraph of the article body.</p>
              <p>Second paragraph with more detail.</p>
            </article>
          </main>
          <footer><a href="/privacy">Privacy</a> <a href="/terms">Terms</a></footer>
          <div class="cookie-banner">This site uses cookies to improve your experience.</div>
        </body>
      </html>
    `
    const { data, warnings } = await buildTextDocumentData('article.html', html)
    const value = singleExtraction(data).texts?.[0].value ?? ''

    expect(value).toContain('Article Heading')
    expect(value).toContain('First paragraph of the article body.')
    expect(value).not.toContain('Home')
    expect(value).not.toContain('About')
    expect(value).not.toContain('Contact')
    expect(value).not.toContain('Privacy')
    expect(value).not.toContain('Terms')
    expect(warnings).toEqual([])
  })

  it('warns and imports the full page when extraction finds nothing', async () => {
    const { data, warnings } = await buildTextDocumentData('empty.html', '<html><body><script>var x = 1</script></body></html>')

    expect(singleExtraction(data).texts?.[0].value).toBe('')
    expect(warnings).toEqual(['Could not extract the main content of "empty.html"; imported the full page.'])
  })

  it('derives the title from the file name without the directory or extension', async () => {
    expect((await buildTextDocumentData('docs/my_file.md', 'x')).data._source.identificationMetadata.title).toBe('my file')
    expect((await buildTextDocumentData('My File.txt', 'x')).data._source.identificationMetadata.title).toBe('My File')
  })
})

describe('buildUrlDocumentData', () => {
  const url = 'https://starwars.fandom.com/wiki/Corellia'
  const fetchedAt = '2026-01-01T00:00:00.000Z'

  it('maps the Defuddle title, published date and source URL', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Corellia"/>
          <meta property="article:published_time" content="2007-04-17T00:41:05Z"/>
          <title>Corellia - Wookieepedia</title>
        </head>
        <body>
          <nav>Site navigation Home About</nav>
          <article>
            <h1>Corellia</h1>
            <p>Corellia was a planet located in the Core Worlds.</p>
          </article>
          <footer>Footer links</footer>
        </body>
      </html>
    `
    const { data, warnings } = await buildUrlDocumentData(url, html, true, fetchedAt)
    const identification = data._source.identificationMetadata

    expect(identification.id).toBe(url)
    expect(identification.hash).toBe(url)
    expect(identification.title).toBe('Corellia')
    expect(identification.versionDate).toBe('2007-04-17T00:41:05Z')
    expect(identification.url).toEqual([url])
    expect(singleExtraction(data).texts?.[0].value).toBe('Corellia was a planet located in the Core Worlds.')
    expect(warnings).toEqual([])
  })

  it('warns and imports the whole page when extraction finds nothing', async () => {
    const { data, warnings } = await buildUrlDocumentData(url, '<html><body><script>var x = 1</script></body></html>', true, fetchedAt)

    expect(singleExtraction(data).texts?.[0].value).toBe('')
    expect(data._source.identificationMetadata.title).toBe('Corellia')
    expect(data._source.identificationMetadata.versionDate).toBe(fetchedAt)
    expect(data._source.identificationMetadata.url).toEqual([url])
    expect(warnings).toEqual([`Could not extract the main content of ${url}; imported the full page.`])
  })

  it('passes non-HTML content through untouched with the fetch date', async () => {
    const content = 'Plain text with <angle> brackets kept.'
    const { data, warnings } = await buildUrlDocumentData(url, content, false, fetchedAt)

    expect(singleExtraction(data).texts?.[0].value).toBe(content)
    expect(data._source.identificationMetadata.title).toBe('Corellia')
    expect(data._source.identificationMetadata.versionDate).toBe(fetchedAt)
    expect(data._source.identificationMetadata.url).toEqual([url])
    expect(warnings).toEqual([])
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

  it('preserves heading case', () => {
    expect(stripHtml('<h1>Welcome</h1><p>text</p>')).toBe('Welcome\n\ntext')
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
