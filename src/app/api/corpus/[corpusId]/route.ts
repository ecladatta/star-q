import { getCorpus } from '@/actions/corpus/corpusActions'
import { withErrorHandling } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withErrorHandling(async () => {
    const corpus = await getCorpus(corpusId)
    return Response.json(corpus)
  })
}
