import { headers } from 'next/headers'
import { isAuthEnabled } from '@/auth.config'
import { NotFoundError, UnauthorizedError } from './auth-utils'

export async function withApiHandler(handler: () => Promise<Response>): Promise<Response> {
  // When AUTH_ENABLED=false but API_KEY is configured, enforce it on API routes
  if (!isAuthEnabled()) {
    const apiKey = process.env.API_KEY
    if (apiKey) {
      const headersList = await headers()
      if (headersList.get('x-api-key') !== apiKey) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
  }

  try {
    return await handler()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: 'Not Found' }, { status: 404 })
    }
    throw error
  }
}
