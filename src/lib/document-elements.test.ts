import type { DocumentData } from '@/types/types'
import { describe, expect, it } from 'vitest'
import { buildDocumentElements } from './document-elements'

function documentData(tableData: Array<Array<string | number | null>>): DocumentData {
  return {
    _source: {
      identificationMetadata: { id: 'x', versionDate: '2020', hash: 'h' },
      extractionMetadata: [{
        texts: [],
        tables: [{ startOffset: 0, endOffset: 10, tableData }],
      }],
    },
  }
}

describe('buildDocumentElements', () => {
  it('coerces every table cell to a string', () => {
    const [element] = buildDocumentElements(documentData([
      ['Year', 'Count'],
      [2020, 3],
      ['x', null],
    ]))

    expect(element?.value).toEqual([
      ['Year', 'Count'],
      ['2020', '3'],
      ['x', ''],
    ])
  })
})
