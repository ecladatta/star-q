import { getCorpusAnalytics } from '@/actions/analytics/analyticsActions'
import { withApiHandler } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: Promise<{ corpusId: string }> }) {
  const { corpusId } = await params
  return withApiHandler(async () => {
    const analytics = await getCorpusAnalytics(corpusId)
    return Response.json(analytics)
  })
}
