import type { Corpus } from '@/db/schema'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocument } from '@/actions/document/documentActions'
import Header from '@/components/header'

export default async function DocumentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = await params
  const document = await getDocument(documentId)

  let corpus: Corpus | undefined

  if (document) {
    corpus = await getCorpus(document.corpusId)
  }

  return (
    <>
      <Header
        corpus={corpus}
        document={document}
      />
      <div className="mt-16">{children}</div>
    </>
  )
}
