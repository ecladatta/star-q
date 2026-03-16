import { getCorpusCustomEntities } from '@/actions/corpus/corpusActions'
import { withApiHandler } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withApiHandler(async () => {
    const entities = await getCorpusCustomEntities(corpusId)
    return Response.json(entities)
  })
}
