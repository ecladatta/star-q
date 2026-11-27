import type { DocumentData, DocumentExtractionMetadata } from '@/types/types'
import { describe, expect, it } from 'vitest'
import wtf from 'wtf_wikipedia'
import { buildDocumentElements } from '@/lib/document-elements'
import { buildWikitextDocumentData } from './wikitextDocumentData'

function singleExtraction(data: DocumentData): DocumentExtractionMetadata {
  const metadata = data._source.extractionMetadata
  return Array.isArray(metadata) ? metadata[0] : metadata
}

const WIKITEXT = `{{Infobox ship
| name = HMS Victory
| launched = 1765
}}
HMS Victory is a [[ship of the line]] launched in 1765.

== Service history ==
Victory served in the [[Royal Navy]].

=== Trafalgar ===
At Trafalgar she was Nelson's [[flagship]].

{| class="wikitable"
! Year
! Commander
|-
| 1805
| Nelson
|-
| 1793
| Howe
|}

More text after the table.

== See also ==
`

describe('buildWikitextDocumentData', () => {
  it('chunks the page into a preamble and heading sections', () => {
    const extraction = singleExtraction(buildWikitextDocumentData('hms_victory.wikitext', WIKITEXT))

    expect(extraction.texts?.map(text => text.title)).toEqual([
      null,
      'Service history',
      'Trafalgar',
      'See also',
    ])
    expect(extraction.texts?.map(text => text.level)).toEqual([0, 2, 3, 2])
    expect(extraction.texts?.map(text => text.index)).toEqual([0, 1, 2, 3])
    expect(extraction.texts?.[0].value).toBe('\nHMS Victory is a [[ship of the line]] launched in 1765.\n')
    expect(extraction.texts?.[2].value).toBe('\nAt Trafalgar she was Nelson\'s [[flagship]].\n\n\nMore text after the table.\n')
  })

  it('keeps a trailing heading with an empty body', () => {
    const extraction = singleExtraction(buildWikitextDocumentData('hms_victory.wikitext', WIKITEXT))
    const seeAlso = extraction.texts?.at(-1)

    expect(seeAlso?.title).toBe('See also')
    expect(seeAlso?.value).toBe('')
  })

  it('emits converted offsets that are strictly monotonic and match the read-time renderer', () => {
    const data = buildWikitextDocumentData('hms_victory.wikitext', WIKITEXT)
    const extraction = singleExtraction(data)
    const texts = extraction.texts ?? []
    const tables = extraction.tables ?? []

    const ordered = [...texts, ...tables].sort((left, right) => left.startOffset! - right.startOffset!)
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].startOffset).toBeGreaterThan(ordered[i - 1].startOffset!)
    }

    for (const text of texts) {
      const converted = wtf(text.value ?? '').text()
      expect(text.endOffset! - text.startOffset!).toBe(converted.length)
    }
    expect(texts[0].startOffset).toBe(0)
    expect(texts[0].endOffset).toBe(wtf(texts[0].value ?? '').text().length)
  })

  it('interleaves the table between its neighbouring text sections', () => {
    const data = buildWikitextDocumentData('hms_victory.wikitext', WIKITEXT)
    const extraction = singleExtraction(data)
    const texts = extraction.texts ?? []
    const table = extraction.tables?.[0]

    expect(table?.tableNum).toBe(0)
    expect(table?.startOffset).toBe(texts[2].endOffset)
    expect(texts[3].startOffset).toBe(table?.endOffset)
  })

  it('derives a header row from a wikitable', () => {
    const extraction = singleExtraction(buildWikitextDocumentData('hms_victory.wikitext', WIKITEXT))

    expect(extraction.tables).toEqual([{
      tableNum: 0,
      startOffset: expect.any(Number),
      endOffset: expect.any(Number),
      tableData: [
        ['Year', 'Commander'],
        ['1805', 'Nelson'],
        ['1793', 'Howe'],
      ],
    }])
  })

  it('tags the technology as WikitextExtractor', () => {
    const extraction = singleExtraction(buildWikitextDocumentData('hms_victory.wikitext', WIKITEXT))

    expect(extraction.technology).toBe('WikitextExtractor')
  })

  it('mirrors the text importer identification metadata', () => {
    const data = buildWikitextDocumentData('docs/hms_victory.wikitext', WIKITEXT)
    const identification = data._source.identificationMetadata

    expect(identification.id).toBe('docs/hms_victory.wikitext')
    expect(identification.title).toBe('hms victory')
    expect(identification.hash).toBe('docs/hms_victory.wikitext')
    expect(identification.wikidata).toBe('')
    expect(identification.url).toEqual([])
    expect(() => new Date(identification.versionDate).toISOString()).not.toThrow()
  })

  it('skips an empty unheaded section but still emits its table', () => {
    const tableOnly = '{| class="wikitable"\n! A\n! B\n|-\n| 1\n| 2\n|}'
    const extraction = singleExtraction(buildWikitextDocumentData('table.wiki', tableOnly))

    expect(extraction.texts).toEqual([])
    expect(extraction.tables).toHaveLength(1)
    expect(extraction.tables?.[0].tableData).toEqual([['A', 'B'], ['1', '2']])
  })

  it('renders through the read-time document elements unchanged', () => {
    const data = buildWikitextDocumentData('hms_victory.wikitext', WIKITEXT)
    const elements = buildDocumentElements(data)

    const trafalgar = elements.find(element => element.type === 'text' && element.data.title === 'Trafalgar')
    expect(trafalgar?.value).toBe('At Trafalgar she was Nelson\'s flagship.\n\nMore text after the table.')
    expect(trafalgar?.data.level).toBe(3)

    const table = elements.find(element => element.type === 'table')
    expect(table?.value).toEqual([['Year', 'Commander'], ['1805', 'Nelson'], ['1793', 'Howe']])
  })
})
