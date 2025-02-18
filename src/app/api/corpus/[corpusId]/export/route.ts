import type { NextRequest } from 'next/server'
import { getAnnotations, getCorpus, getDocumentsMetadata } from '@/actions/corpusActions'

// @TODO: Define the model for the export
type ExportModel = any

export async function GET(request: NextRequest, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params

  const corpus = await getCorpus(corpusId)
  const documents = await getDocumentsMetadata(corpusId)

  const corpusData: ExportModel = {
    id: corpus.id,
    title: corpus.title,
    documents: [],
  }

  for (const document of documents) {
    const docAnnotations = await getAnnotations(document.id)
    corpusData.documents.push({
      id: document.id,
      title: document.title,
      annotations: docAnnotations.map(annotation => ({
        id: annotation.id,
        subject: annotation.subject,
        predicate: annotation.predicate,
        object: annotation.object,
      })),
    })
  }

  const blob = new Blob([JSON.stringify(corpusData, null, 2)], { type: 'application/json' })

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${corpus.title}.json"`,
    },
  })
}
