'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { setTheme, THEME_KEY } from '@/lib/theme'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

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
      setDark(media.matches)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const onClick = () => {
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    setDark(next === 'dark')
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
      {mounted && dark ? <Sun /> : <Moon />}
    </Button>
  )
}
