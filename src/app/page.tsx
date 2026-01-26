import { getCorpuses } from '@/actions/corpus/corpusActions'
import { Corpuses } from '@/components/corpus'

export const dynamic = 'force-dynamic'

export default async function CorpusesPage() {
  const corpuses = await getCorpuses()
  return <Corpuses corpuses={corpuses} />
}
