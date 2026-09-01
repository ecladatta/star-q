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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CorpusMoveToTeamDialogProps = {
  teams: Array<{ id: string, name: string, slug: string }>
  title: string
  description: ReactNode
  confirmLabel: string
  triggerLabel: string
  action: (teamId: string) => Promise<void>
}

export function CorpusMoveToTeamDialog({
  teams,
  title,
  description,
  confirmLabel,
  triggerLabel,
  action,
}: CorpusMoveToTeamDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const selectId = useId()

  const confirm = () => {
    if (!selectedTeamId) {
      return
    }
    startTransition(async () => {
      try {
        await action(selectedTeamId)
        toast.success('Corpus moved')
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
          setSelectedTeamId(teams[0]?.id ?? '')
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={teams.length === 0}>{triggerLabel}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={selectId}>Target team</Label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger id={selectId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {`${team.name} (${team.slug})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending || !selectedTeamId}
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
