import { getCorpuses } from '@/actions/corpus/corpusActions'

export async function GET() {
  const corpuses = await getCorpuses()
  return Response.json(corpuses)
}
