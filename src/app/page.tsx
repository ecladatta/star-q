import { getCorpuses } from '@/actions/corpusActions'
import { Corpuses } from './corpus'

export default async function CorpusesPage() {
  const corpuses = await getCorpuses()
  return <Corpuses corpuses={corpuses} />
}
