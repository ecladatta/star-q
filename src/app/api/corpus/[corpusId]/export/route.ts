import type { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/api-utils'
import { requireViewCorpus } from '@/lib/corpus-access'
import {
  buildCorpusExportModel,
  getExportFilename,
  resolveExportFormat,
} from '@/lib/exports/corpus-export'
import { EXPORT_FORMATS } from '@/lib/exports/export-format'
import { serializeExport } from '@/lib/exports/serialize-corpus-export'

export async function GET(request: NextRequest, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withApiHandler(async () => {
    await requireViewCorpus(corpusId)

    const format = resolveExportFormat(request)

    if (!format) {
      return Response.json(
        {
          error: 'Unsupported export format or RDF mode. Use json, quickstatements, or use rdf with mode=truthy|full.',
        },
        { status: 400 },
      )
    }

    const corpusData = await buildCorpusExportModel(corpusId)

    if (EXPORT_FORMATS[format].kind === 'rdf' && !corpusData.wikibase) {
      return Response.json(
        { error: 'RDF export requires a Wikibase instance, and none is available for this corpus.' },
        { status: 400 },
      )
    }

    const serializedExport = serializeExport(corpusData, format)
    const filename = getExportFilename(corpusData.title, `corpus-${corpusId}`, serializedExport.extension)

    const headers: HeadersInit = {
      'Content-Type': serializedExport.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
    if (serializedExport.skippedCount && serializedExport.skippedCount > 0) {
      headers['X-QuickStatements-Skipped'] = String(serializedExport.skippedCount)
    }

    return new Response(serializedExport.body, { headers })
  })
}
