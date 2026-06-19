'use client'

import { useMemo } from 'react'
import { PopoverAnchor } from '@/components/ui/popover'

type DocumentPopoverAnchorProps = {
  top: number
  left: number
  width?: number
  height?: number
}

export function DocumentPopoverAnchor({
  top,
  left,
  width = 1,
  height = 1,
}: DocumentPopoverAnchorProps) {
  const virtualRef = useMemo(() => {
    const getRect = () => {
      const scrollX = typeof window === 'undefined' ? 0 : window.scrollX
      const scrollY = typeof window === 'undefined' ? 0 : window.scrollY
      const x = left - scrollX
      const y = top - scrollY

      return new DOMRect(x, y, width, height)
    }

    return {
      current: {
        getBoundingClientRect: getRect,
        getClientRects: () => {
          const rect = getRect()
          return [rect]
        },
        contextElement: typeof document === 'undefined' ? undefined : document.body,
      },
    }
  }, [height, left, top, width])

  return <PopoverAnchor virtualRef={virtualRef} />
}
