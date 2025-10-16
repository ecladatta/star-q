import { getCorpus } from '@/actions/corpus/corpusActions'
import Header from '@/components/header'

export default async function CorpusLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ corpusId: string }>
}) {
  const { corpusId } = await params
  const corpus = await getCorpus(corpusId)

  const corpusTitle = corpus?.title ?? undefined

  return (
    <>
      <Header corpusTitle={corpusTitle} corpusId={corpusId} />
      <div className="mt-16">{children}</div>
    </>
  )
}
