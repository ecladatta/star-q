import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getTeamBySlug } from '@/actions/team/teamActions'
import { NotFoundError } from '@/lib/auth-utils'

export default async function TeamLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  try {
    await getTeamBySlug(slug)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  }

  return <>{children}</>
}
