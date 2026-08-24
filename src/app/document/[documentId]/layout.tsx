import type { ReactNode } from 'react'
import type { Corpus } from '@/db/schema'
import { notFound } from 'next/navigation'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocument } from '@/actions/document/documentActions'
import Header from '@/components/header'
import { NotFoundError } from '@/lib/auth-utils'

export default async function DocumentLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = await params

  let document
  try {
    document = await getDocument(documentId)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  }

  let corpus: Corpus | undefined

  if (document) {
    try {
      corpus = await getCorpus(document.corpusId)
    } catch (error) {
      if (error instanceof NotFoundError) {
        notFound()
      }
      throw error
    }
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
