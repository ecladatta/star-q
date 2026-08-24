import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getCorpus } from '@/actions/corpus/corpusActions'
import Header from '@/components/header'
import { NotFoundError } from '@/lib/auth-utils'

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

  return (
    <>
      <Header corpus={corpus} />
      <div className="mt-16">{children}</div>
    </>
  )
}
