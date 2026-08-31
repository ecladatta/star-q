'use client'

import type { CorpusCollaboratorRole } from '@/db/schema'
import { unstable_rethrow } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateCorpusCollaboratorRole } from '@/actions/collaboration/collaborationActions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CorpusCollaboratorRoleSelectProps = {
  collaborationId: string
  role: CorpusCollaboratorRole
}

export function CorpusCollaboratorRoleSelect({ collaborationId, role }: CorpusCollaboratorRoleSelectProps) {
  const [selectedRole, setSelectedRole] = useState(role)
  const [isPending, startTransition] = useTransition()

  const updateRole = (nextRole: CorpusCollaboratorRole) => {
    if (nextRole === selectedRole) {
      return
    }

    const previousRole = selectedRole
    setSelectedRole(nextRole)
    startTransition(async () => {
      try {
        await updateCorpusCollaboratorRole(collaborationId, nextRole)
        toast.success('Role updated')
      } catch (error) {
        unstable_rethrow(error)
        setSelectedRole(previousRole)
        toast.error(error instanceof Error ? error.message : 'Failed to update role.')
      }
    })
  }

  return (
    <Select value={selectedRole} disabled={isPending} onValueChange={value => updateRole(value as CorpusCollaboratorRole)}>
      <SelectTrigger size="sm" className="w-24 capitalize" aria-label="Collaborator role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="viewer">Viewer</SelectItem>
        <SelectItem value="editor">Editor</SelectItem>
      </SelectContent>
    </Select>
  )
}
