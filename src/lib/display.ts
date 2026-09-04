import { useSyncExternalStore } from 'react'

export const FULL_WIDTH_KEY = 'starq-full-width'

function subscribeFullWidth(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export function useFullWidth(): boolean {
  return useSyncExternalStore(
    subscribeFullWidth,
    () => document.documentElement.classList.contains('doc-full-width'),
    () => false,
  )
}

export function readFullWidth(): boolean {
  return document.documentElement.classList.contains('doc-full-width')
}

export function setFullWidth(fullWidth: boolean) {
  document.documentElement.classList.toggle('doc-full-width', fullWidth)
  try {
    localStorage.setItem(FULL_WIDTH_KEY, fullWidth ? '1' : '0')
  } catch {}
}
