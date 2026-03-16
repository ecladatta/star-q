import { getCorpusAnalytics } from '@/actions/analytics/analyticsActions'

export async function GET(request: Request, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  const analytics = await getCorpusAnalytics(corpusId)
  return Response.json(analytics)
}
