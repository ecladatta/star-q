'use client'
import type { ReactNode } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from './ui/button'

type SignInButtonProps = {
  id: string
  children: ReactNode
}

export function SignInButton({ id, children }: SignInButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => signIn(id)}
    >
      {children}
    </Button>
  )
}
