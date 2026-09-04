'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/utils'

type GuestBarProps = {
  setupCompleted: boolean
  signupEnabled: boolean
  signinEnabled: boolean
}

export function GuestBar({ setupCompleted, signupEnabled, signinEnabled }: GuestBarProps) {
  const pathname = usePathname()
  const hasCorpusNav = pathname.startsWith('/corpus/') || pathname.startsWith('/document/')

  return (
    <header className={cn('flex h-14 shrink-0 items-center justify-between bg-muted px-4 sm:px-6', !hasCorpusNav && 'border-b')}>
      <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight hover:opacity-75">
        <Image src="/logo.svg" alt="" width={24} height={24} unoptimized />
        {APP_NAME}
      </Link>
      {setupCompleted
        ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hover:bg-border dark:hover:bg-background" asChild>
                <Link href="/explore">Explore</Link>
              </Button>
              {signupEnabled && signinEnabled && (
                <Button variant="ghost" size="sm" className="hover:bg-border dark:hover:bg-background" asChild>
                  <Link href="/sign-up">Sign up</Link>
                </Button>
              )}
              <Button size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          )
        : (
            <Button size="sm" asChild>
              <Link href="/setup">Set up</Link>
            </Button>
          )}
    </header>
  )
}
