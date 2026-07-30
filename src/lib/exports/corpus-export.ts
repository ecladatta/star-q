import type { CorpusExportFormat } from './export-format'
import type { AnnotationExport, ExportModel } from '@/types/types'
import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus, getCorpusCustomEntities } from '@/actions/corpus/corpusActions'
import { getDocumentsMetadata, getRawDocumentData } from '@/actions/document/documentActions'

export async function buildCorpusExportModel(corpusId: string): Promise<ExportModel> {
  const [corpus, documents, customEntities] = await Promise.all([
    getCorpus(corpusId),
    getDocumentsMetadata(corpusId),
    getCorpusCustomEntities(corpusId),
  ])

  return {
    exportMeta: {
      version: '1.3',
      type: 'full-corpus-export',
    },
    id: corpus.id,
    title: corpus.title,
    createdAt: corpus.createdAt ? corpus.createdAt.toISOString() : null,
    updatedAt: corpus.updatedAt ? corpus.updatedAt.toISOString() : null,
    documents: await Promise.all(documents.map(async (document) => {
      const [docAnnotations, rawContent] = await Promise.all([
        getAnnotations(document.id),
        getRawDocumentData(document.id),
      ])
      if (!rawContent) {
        throw new Error(`Raw document data not found for document ${document.id}`)
      }

      const annotations: AnnotationExport[] = docAnnotations.map(annotation => ({
        id: annotation.id,
        subject: { ...annotation.subject },
        predicate: { ...annotation.predicate },
        object: { ...annotation.object },
        qualifiers: annotation.qualifiers.map(qualifier => ({
          id: qualifier.id,
          predicate: { ...qualifier.predicate },
          value: { ...qualifier.value },
          position: qualifier.position,
        })),
      }))

      return {
        id: document.id,
        title: document.title,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt ? document.updatedAt.toISOString() : null,
        completedAt: document.completedAt ? document.completedAt.toISOString() : null,
        order: document.order,
        raw: rawContent,
        annotations,
      }
    })),
    customEntities,
  }
}

export function resolveCorpusExportFormat(request: Request): CorpusExportFormat | null {
  const url = new URL(request.url)
  const requestedFormat = url.searchParams.get('format')?.trim().toLowerCase()
  const requestedMode = url.searchParams.get('mode')?.trim().toLowerCase()

  if (!requestedFormat) {
    if (requestedMode) {
      return null
    }

    const accept = request.headers.get('accept')?.toLowerCase() ?? ''
    return accept.includes('text/turtle') ? 'rdf-full' : 'json'
  }

  if (requestedFormat === 'json') {
    return requestedMode ? null : 'json'
  }

  if (requestedFormat === 'rdf' || requestedFormat === 'ttl' || requestedFormat === 'turtle') {
    if (!requestedMode || requestedMode === 'full') {
      return 'rdf-full'
    }

    return requestedMode === 'truthy' ? 'rdf-truthy' : null
  }

  return null
}

export function getCorpusExportFilename(corpusData: ExportModel, extension: string): string {
  const baseName = corpusData.title?.trim() || `corpus-${corpusData.id}`
  const safeName = baseName
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${safeName || 'corpus'}.${extension}`
}
