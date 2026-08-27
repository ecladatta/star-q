import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAppSettings } from '@/lib/app-settings'
import { requirePageUser } from '@/lib/auth-utils'

export default async function TeamsLayout({ children }: { children: ReactNode }) {
  if (!(await getAppSettings()).setupCompletedAt) {
    redirect('/setup')
  }
  await requirePageUser()
  return children
}
