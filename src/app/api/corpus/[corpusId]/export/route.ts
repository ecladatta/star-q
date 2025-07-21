import type { NextRequest } from 'next/server'
import type { ExportModel } from '@/types/types'
import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocumentsMetadata, getRawDocumentData } from '@/actions/document/documentActions'

export async function GET(request: NextRequest, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params

  const corpus = await getCorpus(corpusId)
  const documents = await getDocumentsMetadata(corpusId)

  const corpusData: ExportModel = {
    exportMeta: {
      version: '1.0',
      type: 'full-corpus-export',
    },
    id: corpus.id,
    title: corpus.title ?? '',
    createdAt: corpus.createdAt ? corpus.createdAt.toISOString() : '',
    documents: await Promise.all(documents.map(async (document) => {
      const docAnnotations = await getAnnotations(document.id)
      const rawContent = await getRawDocumentData(document.id)
      return {
        id: document.id,
        title: document.title,
        createdAt: document.createdAt.toISOString(),
        content: rawContent,
        annotations: docAnnotations.map((annotation: any) => ({
          id: annotation.id,
          subject: { ...annotation.subject },
          predicate: { ...annotation.predicate },
          object: { ...annotation.object },
        })),
      }
    })),
  }

  return new Response(JSON.stringify(corpusData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${corpusData.title}.json"`,
    },
  })
}
