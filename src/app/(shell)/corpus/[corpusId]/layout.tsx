import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocumentsMetadata } from '@/actions/document/documentActions'
import { CorpusNav } from '@/components/shell/corpus-nav'
import { WikibaseInstanceProvider } from '@/components/wikibase-instance-provider'
import { NotFoundError } from '@/lib/auth-utils'
import { getCorpusAccess } from '@/lib/corpus-access'
import { loadCorpusWikibaseConfig } from '@/lib/wikibase-server'

export default async function CorpusLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ corpusId: string }>
}) {
  const { corpusId } = await params

  let corpus
  try {
    corpus = await getCorpus(corpusId)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  }

  const access = await getCorpusAccess(corpusId)
  const canManage = access === 'manager'
  const canEdit = access === 'editor' || access === 'manager'
  const documentCount = (await getDocumentsMetadata(corpusId)).length
  const wikibase = await loadCorpusWikibaseConfig(corpusId)

  return (
    <WikibaseInstanceProvider instance={wikibase.instance}>
      <CorpusNav corpusId={corpusId} corpusTitle={corpus.title} canManage={canManage} canEdit={canEdit} documentCount={documentCount}>
        {children}
      </CorpusNav>
    </WikibaseInstanceProvider>
  )
}
