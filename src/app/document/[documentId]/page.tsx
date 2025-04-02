import { getAnnotations } from '@/actions/annotation/annotationActions'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocument, getDocumentsMetadata } from '@/actions/document/documentActions'
import CorpusView from '@/app/corpus/[corpusId]/corpus-view'

export default async function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  const document = await getDocument(documentId)

  if (!document) {
    return <div>Document not found</div>
  }

  const corpus = await getCorpus(document.corpusId)
  const documentsList = await getDocumentsMetadata(document.corpusId)
  const annotations = await getAnnotations(documentId)

  return <CorpusView corpus={corpus} documents={documentsList} document={document} annotations={annotations} />
}
