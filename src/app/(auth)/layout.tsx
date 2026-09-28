import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { APP_NAME } from '@/lib/config'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-6">
      <Link href="/" className="flex w-fit items-center gap-2 hover:opacity-75">
        <Logo className="size-7 shrink-0" />
        <span className="text-lg font-semibold tracking-[-0.01em]">{APP_NAME}</span>
      </Link>
      <div className="flex flex-1 items-center justify-center py-4">
        {children}
      </div>
    </div>
  )
}
