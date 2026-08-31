import type { DocumentData, DocumentExtractionMetadata } from '@/types/types'
import { describe, expect, it } from 'vitest'
import { buildTableDocumentData, csvDelimiterForFileName } from './csvDocumentData'

function singleExtraction(data: DocumentData): DocumentExtractionMetadata {
  const metadata = data._source.extractionMetadata
  return Array.isArray(metadata) ? metadata[0] : metadata
}

describe('csvDelimiterForFileName', () => {
  it('uses a tab for .tsv files', () => {
    expect(csvDelimiterForFileName('data.tsv')).toBe('\t')
  })

  it('uses a comma for .csv files', () => {
    expect(csvDelimiterForFileName('data.csv')).toBe(',')
  })
})

describe('buildTableDocumentData', () => {
  it('parses CSV content into a single table element', () => {
    const data = buildTableDocumentData('people.csv', 'name,age\nAlice,30\nBob,25')
    const extraction = singleExtraction(data)

    expect(data._source.identificationMetadata.id).toBe('people.csv')
    expect(data._source.identificationMetadata.title).toBe('people')
    expect(data._source.identificationMetadata.hash).toBe('people.csv')
    expect(extraction.technology).toBe('table')
    expect(extraction.texts).toEqual([])
    expect(extraction.tables).toEqual([{
      tableNum: 0,
      startOffset: 0,
      endOffset: 'name,age\nAlice,30\nBob,25'.length,
      tableData: [
        ['name', 'age'],
        ['Alice', '30'],
        ['Bob', '25'],
      ],
    }])
  })

  it('splits TSV content on tabs', () => {
    const data = buildTableDocumentData('data.tsv', 'name\tage\nAlice\t30')

    expect(singleExtraction(data).tables?.[0].tableData).toEqual([
      ['name', 'age'],
      ['Alice', '30'],
    ])
  })

  it('handles quoted fields containing the delimiter', () => {
    const data = buildTableDocumentData('notes.csv', '"a, b","c"\n1,2')

    expect(singleExtraction(data).tables?.[0].tableData).toEqual([
      ['a, b', 'c'],
      ['1', '2'],
    ])
  })
})
