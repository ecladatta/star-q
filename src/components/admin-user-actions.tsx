'use client'

import type { UserRole } from '@/db/schema'
import { KeyRoundIcon, MoreVerticalIcon, ShieldBanIcon, Trash2Icon, UserPenIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteAdminManagedUser, getUserDeletionImpact, resetUserPassword, setUserBlocked, updateAdminManagedUser } from '@/actions/admin/adminActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AdminUserActionsProps = {
  user: {
    id: string
    name: string | null
    username: string | null
    role: UserRole
    status: string
  }
  currentUserId: string
  canResetPassword: boolean
}

export function AdminUserActions({ user, currentUserId, canResetPassword }: AdminUserActionsProps) {
  const router = useRouter()
  const isSelf = user.id === currentUserId

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [editName, setEditName] = useState(user.name ?? '')
  const [editUsername, setEditUsername] = useState(user.username ?? '')
  const [editRole, setEditRole] = useState<UserRole>(user.role)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  const [isSavingUser, setIsSavingUser] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const isBlocked = user.status === 'blocked'

  const handleEditClick = () => {
    setEditName(user.name ?? '')
    setEditUsername(user.username ?? '')
    setEditRole(user.role)
    setShowEditDialog(true)
  }

  const confirmEdit = async () => {
    if (!editName.trim() || !editUsername.trim()) {
      return
    }
    try {
      setIsSavingUser(true)
      await updateAdminManagedUser(user.id, { name: editName, username: editUsername, role: editRole })
      setShowEditDialog(false)
      toast.success('User updated')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update the user. Please try again.')
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleResetPasswordClick = () => {
    setTemporaryPassword('')
    setShowResetPasswordDialog(true)
  }

  const confirmResetPassword = async () => {
    if (!temporaryPassword.trim()) {
      return
    }
    try {
      setIsResettingPassword(true)
      await resetUserPassword(user.id, temporaryPassword)
      setShowResetPasswordDialog(false)
      toast.success('Password reset, sessions revoked')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset the password. Please try again.')
    } finally {
      setIsResettingPassword(false)
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
          <DropdownMenuItem onClick={handleEditClick}>
            <UserPenIcon className="mr-2 size-4" />
            Edit user...
          </DropdownMenuItem>
          {canResetPassword && (
            <DropdownMenuItem onClick={handleResetPasswordClick}>
              <KeyRoundIcon className="mr-2 size-4" />
              Reset password...
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setShowBlockDialog(true)} disabled={isSelf}>
            <ShieldBanIcon className="mr-2 size-4" />
            {isBlocked ? 'Unblock user...' : 'Block user...'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            disabled={isSelf}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="mr-2 size-4" />
            Delete user...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Updating the account revokes the user's active sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`admin-user-name-${user.id}`}>Display name</Label>
              <Input
                id={`admin-user-name-${user.id}`}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor={`admin-user-username-${user.id}`}>Username</Label>
              <Input
                id={`admin-user-username-${user.id}`}
                value={editUsername}
                onChange={e => setEditUsername(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor={`admin-user-role-${user.id}`}>Role</Label>
              <Select value={editRole} onValueChange={value => setEditRole(value as UserRole)}>
                <SelectTrigger id={`admin-user-role-${user.id}`} className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEdit} disabled={isSavingUser || !editName.trim() || !editUsername.trim()}>
              {isSavingUser ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a temporary password for
              {' '}
              <strong>{user.name ?? user.username}</strong>
              . All active sessions are revoked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`admin-user-password-${user.id}`}>Temporary password</Label>
              <Input
                id={`admin-user-password-${user.id}`}
                value={temporaryPassword}
                onChange={e => setTemporaryPassword(e.target.value)}
                className="mt-1"
                type="password"
                minLength={4}
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmResetPassword()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmResetPassword} disabled={isResettingPassword || !temporaryPassword.trim()}>
              {isResettingPassword ? 'Resetting...' : 'Reset and revoke sessions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <ConfirmActionButton
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        action={async () => {
          await setUserBlocked(user.id, !isBlocked)
          router.refresh()
        }}
        title={isBlocked ? 'Unblock user?' : 'Block user?'}
        description={isBlocked
          ? 'This will allow the user to sign in again.'
          : 'This will revoke all active sessions and prevent the user from signing in.'}
        confirmLabel={isBlocked ? 'Unblock user' : 'Block user'}
      />

      {/* Delete Dialog */}
      <ConfirmActionButton
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        action={async () => {
          const impact = await getUserDeletionImpact(user.id)
          await deleteAdminManagedUser(user.id, impact)
        }}
        title="Permanently delete user?"
        description={(
          <>
            This will permanently delete
            {' '}
            <strong>{user.name ?? user.username}</strong>
            {' '}
            and all dependent data. This action cannot be undone.
          </>
        )}
        confirmLabel="Delete user"
        variant="destructive"
      />
    </>
  )
}
