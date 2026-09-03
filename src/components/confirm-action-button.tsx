'use client'

import type { ReactNode } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ConfirmActionButtonProps = {
  action: () => Promise<void>
  title: string
  description: ReactNode
  confirmLabel: string
  confirmText?: string | null
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  successMessage?: string
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfirmActionButton({
  action,
  title,
  description,
  confirmLabel,
  confirmText,
  variant = 'default',
  successMessage,
  children,
  open: openProp,
  onOpenChange,
}: ConfirmActionButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [isPending, startTransition] = useTransition()
  const confirmId = useId()

  const open = openProp ?? internalOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen)
    } else {
      setInternalOpen(nextOpen)
    }
    if (!nextOpen) {
      setTyped('')
    }
  }

  const confirm = () => {
    startTransition(async () => {
      try {
        await action()
        if (successMessage) {
          toast.success(successMessage)
        }
        handleOpenChange(false)
      } catch (error) {
        unstable_rethrow(error)
        toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      {openProp === undefined && (
        <AlertDialogTrigger asChild>
          <Button variant={variant}>{children}</Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText !== undefined && (
          <div className="space-y-2">
            <Label htmlFor={confirmId}>
              Type
              {' '}
              <strong>{`"${confirmText}"`}</strong>
              {' '}
              to confirm
            </Label>
            <Input
              id={confirmId}
              value={typed}
              onChange={e => setTyped(e.target.value)}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={isPending || (confirmText !== undefined && typed !== confirmText)}
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
