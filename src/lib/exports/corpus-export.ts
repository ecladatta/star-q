import type { ExportFormat } from './export-format'
import type { ResolvedWikibase } from '@/lib/wikibase'
import type { AnnotationExport, DocumentExport, ExportModel } from '@/types/types'
import { eq } from 'drizzle-orm'
import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus, getCorpusCustomEntities } from '@/actions/corpus/corpusActions'
import { getDocument, getDocumentsMetadata, getRawDocumentData } from '@/actions/document/documentActions'
import { db } from '@/db/drizzle'
import { unit } from '@/db/schema'
import { NotFoundError } from '@/lib/auth-utils'
import { unitOrdering } from '@/lib/units/server'
import { loadCorpusWikibaseConfig } from '@/lib/wikibase-server'

function toWikibaseConfig(wikibase: ResolvedWikibase | null) {
  return wikibase
    ? {
        instance: wikibase.instance,
        sparqlEndpoint: wikibase.sparqlEndpoint,
        conceptBaseUri: wikibase.conceptBaseUri,
      }
    : null
}

async function buildDocumentExport(doc: {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date | null
  completedAt: Date | null
  order: number
}): Promise<DocumentExport> {
  const [docAnnotations, rawContent] = await Promise.all([
    getAnnotations(doc.id),
    getRawDocumentData(doc.id),
  ])
  if (!rawContent) {
    throw new Error(`Raw document data not found for document ${doc.id}`)
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
    id: doc.id,
    title: doc.title,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
    order: doc.order,
    raw: rawContent,
    annotations,
  }
}

export async function buildCorpusExportModel(corpusId: string): Promise<ExportModel> {
  const [corpus, documents, units, customEntities, wikibase] = await Promise.all([
    getCorpus(corpusId),
    getDocumentsMetadata(corpusId),
    db.select().from(unit).where(eq(unit.corpusId, corpusId)).orderBy(...unitOrdering()),
    getCorpusCustomEntities(corpusId),
    loadCorpusWikibaseConfig(corpusId),
  ])

  return {
    exportMeta: {
      version: '1.4',
      type: 'full-corpus-export',
    },
    id: corpus.id,
    title: corpus.title,
    createdAt: corpus.createdAt ? corpus.createdAt.toISOString() : null,
    updatedAt: corpus.updatedAt ? corpus.updatedAt.toISOString() : null,
    wikibase: toWikibaseConfig(wikibase),
    documents: await Promise.all(documents.map(document => buildDocumentExport(document))),
    units,
    customEntities,
  }
}

export async function buildDocumentExportModel(documentId: string): Promise<ExportModel> {
  const doc = await getDocument(documentId)
  if (!doc) {
    throw new NotFoundError(`Document ${documentId} not found.`)
  }

  const [corpus, documentExport, units, customEntities, wikibase] = await Promise.all([
    getCorpus(doc.corpusId),
    buildDocumentExport(doc),
    db.select().from(unit).where(eq(unit.corpusId, doc.corpusId)).orderBy(...unitOrdering()),
    getCorpusCustomEntities(doc.corpusId),
    loadCorpusWikibaseConfig(doc.corpusId),
  ])

  return {
    exportMeta: {
      version: '1.4',
      type: 'single-document-export',
    },
    id: corpus.id,
    title: corpus.title,
    createdAt: corpus.createdAt ? corpus.createdAt.toISOString() : null,
    updatedAt: corpus.updatedAt ? corpus.updatedAt.toISOString() : null,
    wikibase: toWikibaseConfig(wikibase),
    documents: [documentExport],
    units,
    customEntities,
  }
}

export function resolveExportFormat(request: Request): ExportFormat | null {
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

  if (requestedFormat === 'quickstatements' || requestedFormat === 'qs') {
    return requestedMode ? null : 'quickstatements'
  }

  if (requestedFormat === 'rdf' || requestedFormat === 'ttl' || requestedFormat === 'turtle') {
    if (!requestedMode || requestedMode === 'full') {
      return 'rdf-full'
    }

    return requestedMode === 'truthy' ? 'rdf-truthy' : null
  }

  return null
}

export function getExportFilename(title: string | null | undefined, fallbackBase: string, extension: string): string {
  const baseName = title?.trim() || fallbackBase
  const safeName = baseName
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${safeName || fallbackBase}.${extension}`
}
