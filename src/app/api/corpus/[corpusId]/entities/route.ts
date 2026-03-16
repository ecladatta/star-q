import { getCorpusCustomEntities } from '@/actions/corpus/corpusActions'

export async function GET(request: Request, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  const entities = await getCorpusCustomEntities(corpusId)
  return Response.json(entities)
}
