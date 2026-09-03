'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { setTheme, THEME_KEY, useRootTheme } from '@/lib/theme'

export function ThemeToggle() {
  const dark = useRootTheme() === 'dark'

  useEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY))
        return
    } catch {}
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_KEY))
          return
      } catch {}
      document.documentElement.classList.toggle('dark', media.matches)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const onClick = () => {
    setTheme(dark ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="hover:bg-border dark:hover:bg-background"
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}
