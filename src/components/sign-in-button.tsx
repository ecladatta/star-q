'use client'
import type { ReactNode } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from './ui/button'

type SignInButtonProps = {
  id: string
  children: ReactNode
  redirectTo?: string
}

export function SignInButton({ id, children, redirectTo = '/' }: SignInButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => signIn(id, { redirectTo })}
    >
      {children}
    </Button>
  )
}
