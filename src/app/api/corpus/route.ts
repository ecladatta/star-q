import { getCorpuses } from '@/actions/corpus/corpusActions'
import { withErrorHandling } from '@/lib/api-utils'

export async function GET() {
  return withErrorHandling(async () => {
    const corpuses = await getCorpuses()
    return Response.json(corpuses)
  })
}
