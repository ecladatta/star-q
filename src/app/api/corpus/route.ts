import { getCorpora } from '@/actions/corpus/corpusActions'
import { withApiHandler } from '@/lib/api-utils'

export async function GET() {
  return withApiHandler(async () => {
    const corpora = await getCorpora()
    return Response.json(corpora)
  })
}
