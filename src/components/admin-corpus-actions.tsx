'use client'

import type { CorpusVisibility } from '@/db/schema'
import { EditIcon, GlobeIcon, LockIcon, MoreVerticalIcon, Trash2Icon, UserCogIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteCorpus, moveCorpusToTeam, renameCorpus, updateCorpusVisibility } from '@/actions/corpus/corpusActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AdminCorpusActionsProps = {
  corpus: {
    id: string
    title: string | null
    visibility: CorpusVisibility
    ownerTeamId: string
  }
  teams: Array<{ id: string, name: string, slug: string }>
}

export function AdminCorpusActions({ corpus, teams }: AdminCorpusActionsProps) {
  const router = useRouter()

  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false)
  const [showOwnerDialog, setShowOwnerDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [visibilitySelection, setVisibilitySelection] = useState<CorpusVisibility>(corpus.visibility)
  const [ownerSelection, setOwnerSelection] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const [isSavingVisibility, setIsSavingVisibility] = useState(false)
  const [isChangingOwner, setIsChangingOwner] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)

  const targetTeams = teams.filter(team => team.id !== corpus.ownerTeamId)

  const handleVisibilityClick = () => {
    setVisibilitySelection(corpus.visibility)
    setShowVisibilityDialog(true)
  }

  const confirmVisibility = async () => {
    try {
      setIsSavingVisibility(true)
      await updateCorpusVisibility(corpus.id, visibilitySelection)
      setShowVisibilityDialog(false)
      toast.success('Visibility updated')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility. Please try again.')
    } finally {
      setIsSavingVisibility(false)
    }
  }

  const handleOwnerClick = () => {
    setOwnerSelection(targetTeams[0]?.id ?? '')
    setShowOwnerDialog(true)
  }

  const confirmOwner = async () => {
    if (!ownerSelection) {
      return
    }
    try {
      setIsChangingOwner(true)
      await moveCorpusToTeam(corpus.id, ownerSelection)
      setShowOwnerDialog(false)
      toast.success('Corpus owner updated')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change the owner. Please try again.')
    } finally {
      setIsChangingOwner(false)
    }
  }

  const handleRenameClick = () => {
    setNewTitle(corpus.title ?? '')
    setShowRenameDialog(true)
  }

  const confirmRename = async () => {
    if (!newTitle.trim()) {
      return
    }
    try {
      setIsRenaming(true)
      await renameCorpus(corpus.id, newTitle)
      setShowRenameDialog(false)
      toast.success('Corpus renamed')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename the corpus. Please try again.')
    } finally {
      setIsRenaming(false)
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
          <DropdownMenuItem onClick={handleVisibilityClick}>
            {corpus.visibility === 'public'
              ? <GlobeIcon className="mr-2 size-4" />
              : <LockIcon className="mr-2 size-4" />}
            Change visibility...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOwnerClick} disabled={targetTeams.length === 0}>
            <UserCogIcon className="mr-2 size-4" />
            Change owner...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRenameClick}>
            <EditIcon className="mr-2 size-4" />
            Rename...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="mr-2 size-4" />
            Delete corpus...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Visibility Dialog */}
      <Dialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change visibility</DialogTitle>
            <DialogDescription>
              Choose who can read this corpus. Editing still requires explicit access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`admin-visibility-${corpus.id}`}>Visibility</Label>
              <Select value={visibilitySelection} onValueChange={value => setVisibilitySelection(value as CorpusVisibility)}>
                <SelectTrigger id={`admin-visibility-${corpus.id}`} className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVisibilityDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmVisibility}
              disabled={isSavingVisibility || visibilitySelection === corpus.visibility}
            >
              {isSavingVisibility ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner Dialog */}
      <Dialog open={showOwnerDialog} onOpenChange={setShowOwnerDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change owner</DialogTitle>
            <DialogDescription>
              Move this corpus to another team. The new owner team gets full control, including its settings and access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`admin-owner-${corpus.id}`}>New owner team</Label>
              <Select value={ownerSelection} onValueChange={setOwnerSelection}>
                <SelectTrigger id={`admin-owner-${corpus.id}`} className="mt-1 w-full">
                  <SelectValue placeholder={targetTeams.length === 0 ? 'No other team available' : 'Select a team'} />
                </SelectTrigger>
                <SelectContent>
                  {targetTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {`${team.name} (${team.slug})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOwnerDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmOwner}
              disabled={isChangingOwner || !ownerSelection}
            >
              {isChangingOwner ? 'Moving...' : 'Change owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename corpus</DialogTitle>
            <DialogDescription>Enter a new name for this corpus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`admin-rename-${corpus.id}`}>Corpus name</Label>
              <Input
                id={`admin-rename-${corpus.id}`}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="mt-1"
                placeholder="Enter the new corpus name"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    confirmRename()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={isRenaming || !newTitle.trim()}>
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmActionButton
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        action={async () => {
          await deleteCorpus(corpus.id)
          router.refresh()
        }}
        title="Delete this corpus?"
        description={(
          <>
            This will permanently delete
            {' '}
            <strong>{corpus.title}</strong>
            , its documents, and its annotations. This action cannot be undone.
          </>
        )}
        confirmText={corpus.title}
        confirmLabel="Delete this corpus"
        variant="destructive"
      />
    </>
  )
}
