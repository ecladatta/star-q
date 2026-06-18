import type { NextRequest } from 'next/server'
import type { ExportModel } from '@/types/types'
import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus, getCorpusCustomEntities } from '@/actions/corpus/corpusActions'
import { getDocumentsMetadata, getRawDocumentData } from '@/actions/document/documentActions'
import { withApiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withApiHandler(async () => {
    const corpus = await getCorpus(corpusId)
    const documents = await getDocumentsMetadata(corpusId)
    const customEntities = await getCorpusCustomEntities(corpusId)

    const corpusData: ExportModel = {
      exportMeta: {
        version: '1.3',
        type: 'full-corpus-export',
      },
      id: corpus.id,
      title: corpus.title,
      createdAt: corpus.createdAt ? corpus.createdAt.toISOString() : null,
      updatedAt: corpus.updatedAt ? corpus.updatedAt.toISOString() : null,
      documents: await Promise.all(documents.map(async (document) => {
        const docAnnotations = await getAnnotations(document.id)
        const rawContent = await getRawDocumentData(document.id)
        if (!rawContent) {
          throw new Error(`Raw document data not found for document ${document.id}`)
        }

        return {
          id: document.id,
          title: document.title,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt ? document.updatedAt.toISOString() : null,
          completedAt: document.completedAt ? document.completedAt.toISOString() : null,
          order: document.order,
          raw: rawContent,
          annotations: docAnnotations.map((annotation: any) => ({
            id: annotation.id,
            subject: { ...annotation.subject },
            predicate: { ...annotation.predicate },
            object: { ...annotation.object },
            qualifiers: annotation.qualifiers.map((qualifier: any) => ({
              id: qualifier.id,
              predicate: { ...qualifier.predicate },
              value: { ...qualifier.value },
              position: qualifier.position,
            })),
          })),
        }
      })),
      customEntities,
    }

    return new Response(JSON.stringify(corpusData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${corpusData.title}.json"`,
      },
    })
  })
}
