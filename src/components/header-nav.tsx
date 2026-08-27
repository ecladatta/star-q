'use client'

import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutCurrentUser } from '@/actions/account/accountActions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type HeaderNavProps = {
  invitationCount: number
  username: string
  isAdmin: boolean
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function HeaderNav({ invitationCount, username, isAdmin }: HeaderNavProps) {
  const pathname = usePathname()
  const items = [
    { href: '/browse', label: 'Browse' },
    { href: '/', label: 'My corpora' },
    { href: '/teams', label: 'Teams' },
    { href: '/invitations', label: invitationCount > 0 ? `Invitations (${invitationCount})` : 'Invitations' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Button
              key={item.href}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              asChild
              aria-current={active ? 'page' : undefined}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          )
        })}
        <AccountMenu username={username} />
      </div>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Menu">
              <MenuIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {items.map(item => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account" aria-current={isActive(pathname, '/account') ? 'page' : undefined}>Account</Link>
            </DropdownMenuItem>
            <form action={signOutCurrentUser}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">Sign out</button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

function AccountMenu({ username }: { username: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">{`@${username}`}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/account">Account</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutCurrentUser}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">Sign out</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
