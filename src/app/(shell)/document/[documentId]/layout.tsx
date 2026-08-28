import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocument, getDocumentsMetadata } from '@/actions/document/documentActions'
import { CorpusNav } from '@/components/shell/corpus-nav'
import { NotFoundError } from '@/lib/auth-utils'
import { getCorpusAccess } from '@/lib/corpus-access'

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

  if (document) {
    try {
      await getCorpus(document.corpusId)
    } catch (error) {
      if (error instanceof NotFoundError) {
        notFound()
      }
      throw error
    }
  }

  if (!document) {
    return <>{children}</>
  }

  const corpus = await getCorpus(document.corpusId)
  const access = await getCorpusAccess(document.corpusId)
  const canManage = access === 'manager'
  const canEdit = access === 'editor' || access === 'manager'
  const documentCount = (await getDocumentsMetadata(document.corpusId)).length

  return (
    <CorpusNav
      corpusId={document.corpusId}
      corpusTitle={corpus.title}
      canManage={canManage}
      canEdit={canEdit}
      documentCount={documentCount}
    >
      {children}
    </CorpusNav>
  )
}
