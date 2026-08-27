'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CredentialsSignInForm({ redirectTo = '/' }: { redirectTo?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        setPending(true)
        const formData = new FormData(event.currentTarget)
        const result = await signIn('credentials', {
          username: formData.get('username'),
          password: formData.get('password'),
          redirect: false,
        })
        setPending(false)
        if (result?.error) {
          setError('Invalid username or password, or this account cannot sign in.')
        } else {
          window.location.assign(redirectTo)
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
