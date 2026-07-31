import type { CorpusExportFormat } from './export-format'
import type { ExportModel } from '@/types/types'
import { CORPUS_EXPORT_FORMATS } from './export-format'
import { serializeJsonCorpusExport } from './json-corpus-export'
import { serializeRdfCorpusExport } from './rdf-corpus-export'

export type SerializedCorpusExport = {
  body: string
  contentType: string
  extension: string
}

export function serializeCorpusExport(
  corpusData: ExportModel,
  format: CorpusExportFormat,
): SerializedCorpusExport {
  const configuration = CORPUS_EXPORT_FORMATS[format]
  if (configuration.rdfMode) {
    return {
      body: serializeRdfCorpusExport(corpusData, configuration.rdfMode),
      contentType: 'text/turtle; charset=utf-8',
      extension: configuration.extension,
    }
  }

  return {
    body: serializeJsonCorpusExport(corpusData),
    contentType: 'application/json',
    extension: configuration.extension,
  }
}
