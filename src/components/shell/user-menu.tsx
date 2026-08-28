'use client'

import Link from 'next/link'
import { signOutCurrentUser } from '@/actions/account/accountActions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UserMenuProps = {
  username: string
  name: string | null
}

export function UserMenu({ username, name }: UserMenuProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-border dark:hover:bg-background"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
              {username.slice(0, 1).toUpperCase()}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <span className="block truncate text-[13px] leading-tight font-medium">
              {`@${username}`}
            </span>
            {name && (
              <span className="block truncate text-[11px] leading-tight font-normal text-muted-foreground">
                {name}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account">Account</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <button
              type="button"
              form="user-sign-out"
              className="w-full"
              onPointerUp={event => event.currentTarget.form?.requestSubmit()}
            >
              Sign out
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form id="user-sign-out" action={signOutCurrentUser} />
    </>
  )
}
