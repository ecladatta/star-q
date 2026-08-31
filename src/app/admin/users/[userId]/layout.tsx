import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getAdminUser } from '@/actions/admin/adminActions'
import Header from '@/components/header'
import { NotFoundError } from '@/lib/auth-utils'

export default async function AdminUserLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  let user
  try {
    user = await getAdminUser(userId)
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound()
    }
    throw error
  }

  return (
    <>
      <Header
        crumbs={[
          { href: '/admin', label: 'Admin' },
          { href: '/admin/users', label: 'Users' },
          { label: user.name ?? user.username ?? 'User' },
        ]}
      />
      <div className="mt-16">{children}</div>
    </>
  )
}
