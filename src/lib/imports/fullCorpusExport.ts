import type { ExportModel } from '@/types/types'

export function isFullCorpusExport(value: unknown): value is ExportModel {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  const exportMeta = record.exportMeta
  return (
    typeof exportMeta === 'object'
    && exportMeta !== null
    && (exportMeta as Record<string, unknown>).type === 'full-corpus-export'
    && Array.isArray(record.documents)
  )
}
