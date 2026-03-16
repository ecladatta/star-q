import { UnauthorizedError } from './auth-utils'

export async function withErrorHandling(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}
