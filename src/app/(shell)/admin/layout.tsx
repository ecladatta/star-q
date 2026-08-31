import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/shell/admin-nav'
import { Button } from '@/components/ui/button'
import { getAppSettings } from '@/lib/app-settings'
import { requirePageUser } from '@/lib/auth-utils'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await getAppSettings()).setupCompletedAt) {
    redirect('/setup')
  }
  const actor = await requirePageUser()
  if (actor.role !== 'admin') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold">Forbidden</h1>
          <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this page.</p>
          <Button className="mt-6" asChild>
            <Link href="/">Go to home</Link>
          </Button>
        </div>
      </div>
    )
  }
  return (
    <AdminNav label="Administration">
      {children}
    </AdminNav>
  )
}
