import type { ExportModel } from '@/types/types'
import { getExportFilename, resolveExportFormat } from './corpus-export'
import { EXPORT_FORMATS } from './export-format'
import { serializeExport } from './serialize-corpus-export'

export type ExportFilename = {
  title: string | null | undefined
  fallbackBase: string
}

export async function buildExportFileResponse(
  request: Request,
  exportData: ExportModel,
  filename: ExportFilename = { title: exportData.title, fallbackBase: `corpus-${exportData.id}` },
): Promise<Response> {
  const format = resolveExportFormat(request)

  if (!format) {
    return Response.json(
      {
        error: 'Unsupported export format or RDF mode. Use json, quickstatements, or use rdf with mode=truthy|full.',
      },
      { status: 400 },
    )
  }

  if (EXPORT_FORMATS[format].kind === 'rdf' && !exportData.wikibase) {
    return Response.json(
      { error: 'RDF export requires a Wikibase instance, and none is available for this corpus.' },
      { status: 400 },
    )
  }

  const serializedExport = serializeExport(exportData, format)
  const exportFilename = getExportFilename(filename.title, filename.fallbackBase, serializedExport.extension)

  const headers: Record<string, string> = {
    'Content-Type': serializedExport.contentType,
    'Content-Disposition': `attachment; filename="${exportFilename}"`,
  }
  if (serializedExport.skippedCount && serializedExport.skippedCount > 0) {
    headers['X-QuickStatements-Skipped'] = String(serializedExport.skippedCount)
  }

  return new Response(serializedExport.body, { headers })
}
