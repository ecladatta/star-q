'use client'

import type { ComponentProps } from 'react'
import { Toaster as Sonner } from 'sonner'
import { useRootTheme } from '@/lib/theme'

export function Toaster(props: ComponentProps<typeof Sonner>) {
  const theme = useRootTheme()

  return (
    <Sonner
      theme={theme}
      toastOptions={{ style: { fontSize: '13px' } }}
      {...props}
    />
  )
}
