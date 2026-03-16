import { getCorpus } from '@/actions/corpus/corpusActions'
import { withApiHandler } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withApiHandler(async () => {
    const corpus = await getCorpus(corpusId)
    return Response.json(corpus)
  })
}
