'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommandMenu } from './command-menu'
import { HeaderShell, MainNav } from './header-shell'
import { isActive, topNav } from './nav-items'
import { UserMenu } from './user-menu'

type TopNavUser = {
  username: string
  name: string | null
  isAdmin: boolean
  invitationCount: number
  corpora: { id: string, title: string | null }[]
}

export function TopNav({ user }: { user: TopNavUser }) {
  const pathname = usePathname()
  const items = topNav({ isAdmin: user.isAdmin, invitationCount: user.invitationCount })

  return (
    <HeaderShell
      beforeLogo={(
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {items.map((item) => {
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} aria-current={isActive(pathname, item) ? 'page' : undefined}>
                      {item.label}
                      {item.badge ? ` (${item.badge})` : ''}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account">Account</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    >
      <MainNav items={items} />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <CommandMenu
          isAdmin={user.isAdmin}
          invitationCount={user.invitationCount}
          corpora={user.corpora}
        />
        <ThemeToggle />
        <UserMenu username={user.username} name={user.name} />
      </div>
    </HeaderShell>
  )
}
