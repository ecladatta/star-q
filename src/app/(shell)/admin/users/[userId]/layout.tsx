import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getAdminUser } from '@/actions/admin/adminActions'
import { NotFoundError } from '@/lib/auth-utils'

export default async function AdminUserLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  try {
    await getAdminUser(userId)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  }

  return <>{children}</>
}
