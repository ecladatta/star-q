'use client'

import type { ReactNode } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type ConfirmActionButtonProps = {
  action: () => Promise<void>
  title: string
  description: ReactNode
  confirmLabel: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  successMessage?: string
  children: ReactNode
}

export function ConfirmActionButton({
  action,
  title,
  description,
  confirmLabel,
  variant = 'default',
  successMessage,
  children,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const confirm = () => {
    startTransition(async () => {
      try {
        await action()
        if (successMessage) {
          toast.success(successMessage)
        }
        setOpen(false)
      } catch (error) {
        unstable_rethrow(error)
        toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant}>{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault()
              confirm()
            }}
          >
            {isPending ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
