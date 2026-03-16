import { getCorpuses } from '@/actions/corpus/corpusActions'
import { withApiHandler } from '@/lib/api-utils'

export async function GET() {
  return withApiHandler(async () => {
    const corpuses = await getCorpuses()
    return Response.json(corpuses)
  })
}
