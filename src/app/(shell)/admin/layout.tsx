import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { ForbiddenPage } from '@/components/forbidden-page'
import { AdminNav } from '@/components/shell/admin-nav'
import { getAppSettings } from '@/lib/app-settings'
import { requirePageUser } from '@/lib/auth-utils'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await getAppSettings()).setupCompletedAt) {
    redirect('/setup')
  }
  const actor = await requirePageUser()
  if (actor.role !== 'admin') {
    return <ForbiddenPage />
  }
  return (
    <AdminNav label="Administration">
      {children}
    </AdminNav>
  )
}
