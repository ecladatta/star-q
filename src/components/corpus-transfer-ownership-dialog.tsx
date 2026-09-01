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

type CorpusTransferOwnershipDialogProps = {
  title: string
  description: ReactNode
  confirmLabel: string
  inputLabel: string
  placeholder: string
  triggerLabel: string
  action: (identifier: string) => Promise<void>
}

export function CorpusTransferOwnershipDialog({
  title,
  description,
  confirmLabel,
  inputLabel,
  placeholder,
  triggerLabel,
  action,
}: CorpusTransferOwnershipDialogProps) {
  const [open, setOpen] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputId = useId()

  const confirm = () => {
    const value = identifier.trim()
    if (!value) {
      return
    }
    startTransition(async () => {
      try {
        await action(value)
        toast.success('Ownership transfer requested')
        setOpen(false)
      } catch (error) {
        unstable_rethrow(error)
        toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setIdentifier('')
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">{triggerLabel}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={inputId}>{inputLabel}</Label>
          <Input
            id={inputId}
            value={identifier}
            onChange={event => setIdentifier(event.target.value)}
            placeholder={placeholder}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending || !identifier.trim()}
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
