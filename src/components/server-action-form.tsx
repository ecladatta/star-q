'use client'

import { unstable_rethrow } from 'next/navigation'
import { toast } from 'sonner'

type ServerActionFormProps = {
  action: (formData: FormData) => Promise<void>
  className?: string
  successMessage?: string
  children: React.ReactNode
}

export function ServerActionForm({ action, className, successMessage, children }: ServerActionFormProps) {
  return (
    <form
      className={className}
      action={async (formData) => {
        try {
          await action(formData)
          if (successMessage) {
            toast.success(successMessage)
          }
        } catch (error) {
          unstable_rethrow(error)
          toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
        }
      }}
    >
      {children}
    </form>
  )
}
