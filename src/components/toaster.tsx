'use client'

import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { Toaster as Sonner } from 'sonner'

export function Toaster(props: ComponentProps<typeof Sonner>) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement
    const apply = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light')
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme}
      toastOptions={{ style: { fontSize: '13px' } }}
      {...props}
    />
  )
}
