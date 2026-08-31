import { ForbiddenError, getApiRequestActor, NotFoundError, runWithRequestActor, UnauthorizedError } from './auth-utils'

export async function withApiHandler(handler: () => Promise<Response>): Promise<Response> {
  try {
    const actor = await getApiRequestActor()
    return await runWithRequestActor(actor, handler)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: 'Not Found' }, { status: 404 })
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    throw error
  }
}
