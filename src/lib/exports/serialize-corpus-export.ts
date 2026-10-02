import type { ExportFormat } from './export-format'
import type { ExportModel } from '@/types/types'
import { EXPORT_FORMATS } from './export-format'
import { serializeJsonCorpusExport } from './json-corpus-export'
import { serializeQuickStatementsCorpusExport } from './quickstatements-corpus-export'
import { serializeRdfCorpusExport } from './rdf-corpus-export'

export type SerializedExport = {
  body: string
  contentType: string
  extension: string
  skippedCount?: number
}

export function serializeExport(
  exportData: ExportModel,
  format: ExportFormat,
): SerializedExport {
  const configuration = EXPORT_FORMATS[format]

  if (configuration.kind === 'rdf') {
    return {
      body: serializeRdfCorpusExport(exportData, configuration.rdfMode),
      contentType: 'text/turtle; charset=utf-8',
      extension: configuration.extension,
    }
  }

  if (configuration.kind === 'quickstatements') {
    const exportResult = serializeQuickStatementsCorpusExport(exportData)
    return {
      body: exportResult.body,
      contentType: 'text/tab-separated-values; charset=utf-8',
      extension: configuration.extension,
      skippedCount: exportResult.skippedCount,
    }
  }

  return {
    body: serializeJsonCorpusExport(exportData),
    contentType: 'application/json',
    extension: configuration.extension,
  }
}
