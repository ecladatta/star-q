import { createContext, use, useMemo } from 'react'
import { wikiUrl } from '@/lib/wikibase'

export const WikibaseInstanceContext = createContext<string | null>(null)

export function useWikibaseInstance(): { instance: string, wikiUrl: (id: string) => string } {
  const instance = use(WikibaseInstanceContext)
  if (!instance) {
    throw new Error('useWikibaseInstance must be used within WikibaseInstanceProvider')
  }
  return useMemo(() => ({ instance, wikiUrl: (id: string) => wikiUrl(instance, id) }), [instance])
}
