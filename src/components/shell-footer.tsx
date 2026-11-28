'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const EXCLUDED_PATH_PREFIXES = ['/document/', '/admin']

export function ShellFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (EXCLUDED_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix)))
    return null
  return <>{children}</>
}
