import type { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/api-utils'
import {
  buildCorpusExportModel,
  getCorpusExportFilename,
  resolveCorpusExportFormat,
} from '@/lib/exports/corpus-export'
import { serializeCorpusExport } from '@/lib/exports/serialize-corpus-export'

export async function GET(request: NextRequest, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withApiHandler(async () => {
    const format = resolveCorpusExportFormat(request)

    if (!format) {
      return Response.json(
        {
          error: 'Unsupported export format or RDF mode. Use json, or use rdf with mode=truthy|full.',
        },
        { status: 400 },
      )
    }

    const corpusData = await buildCorpusExportModel(corpusId)
    const serializedExport = serializeCorpusExport(corpusData, format)
    const filename = getCorpusExportFilename(corpusData, serializedExport.extension)

    return new Response(serializedExport.body, {
      headers: {
        'Content-Type': serializedExport.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
