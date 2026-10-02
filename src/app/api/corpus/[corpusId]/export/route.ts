import type { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/api-utils'
import { requireViewCorpus } from '@/lib/corpus-access'
import { buildCorpusExportModel } from '@/lib/exports/corpus-export'
import { buildExportFileResponse } from '@/lib/exports/export-response'

export async function GET(request: NextRequest, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withApiHandler(async () => {
    await requireViewCorpus(corpusId)
    return buildExportFileResponse(request, await buildCorpusExportModel(corpusId))
  })
}
