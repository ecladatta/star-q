import type { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/api-utils'
import { requireViewDocument } from '@/lib/corpus-access'
import { buildDocumentExportModel } from '@/lib/exports/corpus-export'
import { buildExportFileResponse } from '@/lib/exports/export-response'

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  return withApiHandler(async () => {
    await requireViewDocument(documentId)
    return buildExportFileResponse(request, await buildDocumentExportModel(documentId))
  })
}
