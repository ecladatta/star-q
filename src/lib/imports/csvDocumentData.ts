import type { DocumentData } from '@/types/types'
import { parse } from 'csv-parse/sync'
import { documentTitleFromFileName } from './documentTitle'

export function csvDelimiterForFileName(fileName: string): string {
  return /\.tsv$/i.test(fileName) ? '\t' : ','
}

export function buildTableDocumentData(fileName: string, content: string): DocumentData {
  const tableData = parse(content, {
    delimiter: csvDelimiterForFileName(fileName),
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as string[][]

  const title = documentTitleFromFileName(fileName)

  return {
    _source: {
      identificationMetadata: {
        id: fileName,
        title,
        versionDate: new Date().toISOString(),
        hash: fileName,
        wikidata: '',
        url: [],
      },
      extractionMetadata: [{
        technology: 'table',
        texts: [],
        tables: [{
          tableNum: 0,
          startOffset: 0,
          endOffset: content.length,
          tableData,
        }],
      }],
    },
  }
}
