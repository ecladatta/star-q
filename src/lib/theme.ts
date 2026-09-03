import { useSyncExternalStore } from 'react'

export const THEME_KEY = 'starq-theme'

function subscribeRootTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export function useRootTheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribeRootTheme,
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    () => 'light',
  )
}

export function readTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
}

export function toggleTheme() {
  setTheme(readTheme() === 'dark' ? 'light' : 'dark')
}
