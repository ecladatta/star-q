import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getTeamBySlug } from '@/actions/team/teamActions'
import Header from '@/components/header'
import { NotFoundError } from '@/lib/auth-utils'

export default async function TeamLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let data
  try {
    data = await getTeamBySlug(slug)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  }

  return (
    <>
      <Header crumbs={[{ href: '/teams', label: 'Teams' }, { label: data.team.name }]} />
      <div className="mt-16">{children}</div>
    </>
  )
}
