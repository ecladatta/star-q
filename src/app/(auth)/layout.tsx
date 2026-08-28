import type { ReactNode } from 'react'
import { APP_NAME } from '@/lib/config'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <span className="mb-6 text-lg font-semibold tracking-[-0.01em]">{APP_NAME}</span>
      {children}
    </div>
  )
}
