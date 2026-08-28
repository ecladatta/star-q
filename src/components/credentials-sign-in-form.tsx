'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CredentialsSignInForm({ redirectTo = '/', lastUsed }: { redirectTo?: string, lastUsed?: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <form
      className="relative space-y-4"
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
      {lastUsed && (
        <Badge variant="secondary" className="pointer-events-none absolute -top-2 -right-2">
          Last used
        </Badge>
      )}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="h-9 w-full" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
