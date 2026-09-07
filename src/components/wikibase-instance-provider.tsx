'use client'

import type { ReactNode } from 'react'
import { WikibaseInstanceContext } from '@/hooks/useWikibaseInstance'

export function WikibaseInstanceProvider({ instance, children }: { instance: string, children: ReactNode }) {
  return (
    <WikibaseInstanceContext value={instance}>
      {children}
    </WikibaseInstanceContext>
  )
}
