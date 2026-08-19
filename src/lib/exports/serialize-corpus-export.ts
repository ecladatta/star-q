import type { CorpusExportFormat } from './export-format'
import type { ExportModel } from '@/types/types'
import { CORPUS_EXPORT_FORMATS } from './export-format'
import { serializeJsonCorpusExport } from './json-corpus-export'
import { serializeQuickStatementsCorpusExport } from './quickstatements-corpus-export'
import { serializeRdfCorpusExport } from './rdf-corpus-export'

export type SerializedCorpusExport = {
  body: string
  contentType: string
  extension: string
  skippedCount?: number
}

export function serializeCorpusExport(
  corpusData: ExportModel,
  format: CorpusExportFormat,
): SerializedCorpusExport {
  const configuration = CORPUS_EXPORT_FORMATS[format]

  if (configuration.kind === 'rdf') {
    return {
      body: serializeRdfCorpusExport(corpusData, configuration.rdfMode),
      contentType: 'text/turtle; charset=utf-8',
      extension: configuration.extension,
    }
  }

  if (configuration.kind === 'quickstatements') {
    const exportData = serializeQuickStatementsCorpusExport(corpusData)
    return {
      body: exportData.body,
      contentType: 'text/tab-separated-values; charset=utf-8',
      extension: configuration.extension,
      skippedCount: exportData.skippedCount,
    }
  }

  return {
    body: serializeJsonCorpusExport(corpusData),
    contentType: 'application/json',
    extension: configuration.extension,
  }
}
