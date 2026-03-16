import { getCorpus } from '@/actions/corpus/corpusActions'

export async function GET(request: Request, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  const corpus = await getCorpus(corpusId)
  return Response.json(corpus)
}
