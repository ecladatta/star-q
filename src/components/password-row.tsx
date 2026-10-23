'use client'

import { useState } from 'react'
import { PasswordForm } from '@/components/password-form'
import { Button } from '@/components/ui/button'

type PasswordRowProps = {
  hasPassword: boolean
}

export function PasswordRow({ hasPassword }: PasswordRowProps) {
  const [shown, setShown] = useState(false)

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium">Password</span>
        <Button type="button" variant="outline" aria-expanded={shown} onClick={() => setShown(!shown)}>
          {shown ? 'Hide' : 'Change password'}
        </Button>
      </div>
      {shown && (
        <div className="mt-4">
          <PasswordForm hasPassword={hasPassword} />
        </div>
      )}
    </div>
  )
}
