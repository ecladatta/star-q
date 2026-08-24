import { getCorpuses } from '@/actions/corpus/corpusActions'
import { Corpuses } from '@/components/corpus'
import { canEdit } from '@/lib/corpus-access'

export const dynamic = 'force-dynamic'

export default async function CorpusesPage() {
  const corpuses = await getCorpuses()
  const edit = await canEdit()
  return <Corpuses corpuses={corpuses} canEdit={edit} />
}
