'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type FadeNavProps = {
  ariaLabel: string
  wrapperClassName?: string
  navClassName?: string
  leftFadeClassName: string
  rightFadeClassName: string
  children: ReactNode
}

export function FadeNav({ ariaLabel, wrapperClassName, navClassName, leftFadeClassName, rightFadeClassName, children }: FadeNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const [canScroll, setCanScroll] = useState({ left: false, right: false })

  const update = useCallback(() => {
    const el = navRef.current
    if (!el) {
      return
    }
    setCanScroll({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    })
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
    }
  }, [update])

  return (
    <div className={cn('relative shrink-0', wrapperClassName)}>
      {canScroll.left && (
        <div className={cn('pointer-events-none absolute inset-y-0 left-0 z-10 w-8', leftFadeClassName)} />
      )}
      {canScroll.right && (
        <div className={cn('pointer-events-none absolute inset-y-0 right-0 z-10 w-8', rightFadeClassName)} />
      )}
      <nav
        ref={navRef}
        onScroll={update}
        aria-label={ariaLabel}
        className={cn('w-full overflow-x-auto', navClassName)}
      >
        {children}
      </nav>
    </div>
  )
}
