import type { DocumentData, DocumentExtractionMetadata } from '@/types/types'
import wtf from 'wtf_wikipedia'
import { convertWikitextText, WIKITEXT_EXTRACTOR_TECHNOLOGY } from '@/lib/document-elements'
import { documentTitleFromFileName } from './documentTitle'

type WikitextTableJson = Array<Record<string, { text?: string }>>
type WikitextTable = { json: () => WikitextTableJson }

function isWikitextTable(value: object): value is WikitextTable {
  return 'json' in value && typeof value.json === 'function'
}

function totalCharacters(tableData: string[][]): number {
  return tableData.reduce((sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell.length, 0), 0)
}

function tableDataFromWikitextTable(table: WikitextTable): string[][] {
  const rows = table.json()
  if (rows.length === 0) {
    return []
  }

  const headers = Object.keys(rows[0])
  for (const row of rows.slice(1)) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) {
        headers.push(key)
      }
    }
  }

  return [headers, ...rows.map(row => headers.map(header => String(row[header]?.text ?? '')))]
}

export function buildWikitextDocumentData(fileName: string, content: string): DocumentData {
  const page = wtf(content)

  const texts: NonNullable<DocumentExtractionMetadata['texts']> = []
  const tables: NonNullable<DocumentExtractionMetadata['tables']> = []
  let cursor = 0

  for (const section of page.sections()) {
    const title = section.title() || null
    const value = section.wikitext()
    const converted = convertWikitextText(value)

    const hasBody = converted.trim() !== ''
    const hasHeading = title !== null
    if (hasBody || hasHeading) {
      texts.push({
        index: texts.length,
        title,
        level: title ? section.depth() + 2 : 0,
        value,
        startOffset: cursor,
        endOffset: cursor + converted.length,
      })
      cursor += converted.length
    }

    const sectionTables = section.tables()
    const tableList = Array.isArray(sectionTables) ? sectionTables.filter(isWikitextTable) : []
    for (const table of tableList) {
      const tableData = tableDataFromWikitextTable(table)
      const hasDataRows = tableData.length > 1
      if (!hasDataRows) {
        continue
      }

      tables.push({
        tableNum: tables.length,
        startOffset: cursor,
        endOffset: cursor + totalCharacters(tableData),
        tableData,
      })
      cursor += totalCharacters(tableData)
    }
  }

  return {
    _source: {
      identificationMetadata: {
        id: fileName,
        title: documentTitleFromFileName(fileName),
        versionDate: new Date().toISOString(),
        hash: fileName,
        wikidata: '',
        url: [],
      },
      extractionMetadata: [{
        technology: WIKITEXT_EXTRACTOR_TECHNOLOGY,
        texts,
        tables,
      }],
    },
  }
}
