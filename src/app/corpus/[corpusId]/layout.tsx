import type { ReactNode } from 'react'
import { getCorpus } from '@/actions/corpus/corpusActions'
import Header from '@/components/header'

export default async function CorpusLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ corpusId: string }>
}) {
  const { corpusId } = await params
  const corpus = await getCorpus(corpusId)

  return (
    <>
      <Header corpus={corpus} />
      <div className="mt-16">{children}</div>
    </>
  )
}
