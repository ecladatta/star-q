'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeaderShell, MainNav } from './header-shell'
import { guestNav } from './nav-items'

type GuestBarProps = {
  setupCompleted: boolean
  signupEnabled: boolean
  signinEnabled: boolean
}

export function GuestBar({ setupCompleted, signupEnabled, signinEnabled }: GuestBarProps) {
  const items = guestNav()

  return (
    <HeaderShell>
      {setupCompleted && <MainNav items={items} />}
      {setupCompleted
        ? (
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hover:bg-border md:hidden dark:hover:bg-background" asChild>
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
            <Button size="sm" className="ml-auto" asChild>
              <Link href="/setup">Set up</Link>
            </Button>
          )}
    </HeaderShell>
  )
}
