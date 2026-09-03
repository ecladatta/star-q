'use client'

import type { TeamRole } from '@/db/schema'
import { MoreVerticalIcon, Trash2Icon, UserPlusIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteAdminTeam } from '@/actions/admin/adminActions'
import { inviteTeamMember } from '@/actions/team/teamActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AdminTeamActionsProps = {
  team: { id: string, name: string, slug: string }
}

export function AdminTeamActions({ team }: AdminTeamActionsProps) {
  const router = useRouter()

  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('member')
  const [isInviting, setIsInviting] = useState(false)

  const handleInviteClick = () => {
    setInviteUsername('')
    setInviteRole('member')
    setShowInviteDialog(true)
  }

  const confirmInvite = async () => {
    if (!inviteUsername.trim()) {
      return
    }
    try {
      setIsInviting(true)
      await inviteTeamMember(team.id, inviteUsername, inviteRole)
      setShowInviteDialog(false)
      toast.success('Invitation sent')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send the invitation. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={handleInviteClick}>
            <UserPlusIcon className="mr-2 size-4" />
            Invite member...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="mr-2 size-4" />
            Delete team...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              Invite an existing user to
              {' '}
              <strong>{team.name}</strong>
              . They will receive an invitation to accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`admin-invite-username-${team.id}`}>Exact username</Label>
              <Input
                id={`admin-invite-username-${team.id}`}
                value={inviteUsername}
                onChange={e => setInviteUsername(e.target.value)}
                className="mt-1"
                placeholder="Enter the exact username"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmInvite()
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor={`admin-invite-role-${team.id}`}>Role</Label>
              <Select value={inviteRole} onValueChange={value => setInviteRole(value as TeamRole)}>
                <SelectTrigger id={`admin-invite-role-${team.id}`} className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmInvite} disabled={isInviting || !inviteUsername.trim()}>
              {isInviting ? 'Sending...' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmActionButton
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        action={async () => {
          await deleteAdminTeam(team.id)
          router.refresh()
        }}
        title="Delete this team?"
        description={(
          <>
            This will permanently delete
            {' '}
            <strong>{team.name}</strong>
            {' '}
            and all of its corpora, documents, and annotations. This action cannot be undone.
          </>
        )}
        confirmText={team.name}
        confirmLabel="Delete team"
        variant="destructive"
      />
    </>
  )
}
