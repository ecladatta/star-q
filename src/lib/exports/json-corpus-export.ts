import type { ExportModel } from '@/types/types'

export function serializeJsonCorpusExport(corpusData: ExportModel): string {
  return JSON.stringify(corpusData, null, 2)
}
