import { getCorpus } from '@/actions/corpus/corpusActions'
import Header from '@/components/header'
import { ReactNode } from 'react'

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
