import { createContext, use, useMemo } from 'react'
import { wikiUrl } from '@/lib/wikibase'

export const WikibaseInstanceContext = createContext<string | null | undefined>(undefined)

export function useWikibaseInstance(): { instance: string | null, wikiUrl: (id: string) => string | null } {
  const instance = use(WikibaseInstanceContext)
  if (instance === undefined) {
    throw new Error('useWikibaseInstance must be used within WikibaseInstanceProvider')
  }
  return useMemo(() => ({ instance, wikiUrl: (id: string) => (instance ? wikiUrl(instance, id) : null) }), [instance])
}
