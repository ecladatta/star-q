'use client'

import type { ReactNode } from 'react'
import type { CorpusOwnerInput } from '@/actions/corpus/corpusActions'
import type { Corpus } from '@/db/schema'
import type { CorpusAccess } from '@/lib/corpus-access'
import type { ExportFormat } from '@/lib/exports/export-format'
import {
  BarChart3Icon,
  CopyIcon,
  EditIcon,
  FileDownIcon,
  FileUpIcon,
  FolderOpenIcon,
  Loader2Icon,
  MoreVerticalIcon,
  SettingsIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteCorpus, duplicateCorpus, renameCorpus } from '@/actions/corpus/corpusActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
import { ImportWizard } from '@/components/import-wizard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { canEditCorpus } from '@/lib/corpus-access-policy'
import { downloadExportFile } from '@/lib/exports/download'
import {
  EXPORT_FORMATS,
  visibleExportFormatIds,
} from '@/lib/exports/export-format'

type CorpusActionsProps = {
  corpus: Corpus & { documentsCount?: number, annotationsCount?: number }
  showOpenAction?: boolean
  access: CorpusAccess
  triggerButton?: ReactNode
  ownedTeams?: { id: string, name: string, slug: string }[]
  canCopy?: boolean
  rdfAvailable: boolean
}

export function CorpusActions({ corpus, showOpenAction = true, access, triggerButton, ownedTeams = [], canCopy = true, rdfAvailable }: CorpusActionsProps) {
  const canEdit = canEditCorpus(access, corpus.status)
  const canManage = access === 'manager'
  const router = useRouter()

  const exportFormatIds = visibleExportFormatIds(rdfAvailable)

  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)

  const [newDuplicateTitle, setNewDuplicateTitle] = useState('')
  const [newRenameTitle, setNewRenameTitle] = useState('')
  const [ownerSelection, setOwnerSelection] = useState(ownedTeams[0]?.id ?? '')

  const selectedOwner = (): CorpusOwnerInput => ({ teamId: ownerSelection })

  const handleExportClick = (format: ExportFormat) => {
    void downloadExportFile(`/api/corpus/${corpus.id}/export?${EXPORT_FORMATS[format].query}`)
  }

  const handleDuplicateClick = () => {
    setNewDuplicateTitle(`${corpus.title} (copy)`)
    if (corpus.ownerTeamId && ownedTeams.some(team => team.id === corpus.ownerTeamId)) {
      setOwnerSelection(corpus.ownerTeamId)
    } else {
      setOwnerSelection(ownedTeams[0]?.id ?? '')
    }
    setShowDuplicateDialog(true)
  }

  const confirmDuplicate = async () => {
    if (!newDuplicateTitle.trim()) {
      return
    }
    try {
      setIsDuplicating(true)
      await duplicateCorpus(corpus.id, selectedOwner(), newDuplicateTitle)
      setShowDuplicateDialog(false)
      setNewDuplicateTitle('')
      router.refresh()
    } catch (error) {
      console.error('Duplication failed:', error)
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleRenameClick = () => {
    setNewRenameTitle(corpus.title || '')
    setShowRenameDialog(true)
  }

  const confirmRename = async () => {
    if (!newRenameTitle.trim()) {
      return
    }
    try {
      setIsRenaming(true)
      await renameCorpus(corpus.id, newRenameTitle)
      setShowRenameDialog(false)
      setNewRenameTitle('')
      router.refresh()
      toast.success('Corpus renamed')
    } catch (error) {
      console.error('Rename failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to rename the corpus. Please try again.')
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {triggerButton || (
            <Button variant="ghost" size="sm">
              <MoreVerticalIcon className="size-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {showOpenAction && (
            <DropdownMenuItem asChild>
              <a href={`/corpus/${corpus.id}`}>
                <FolderOpenIcon className="mr-2 size-4" />
                Open
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={`/corpus/${corpus.id}/analytics`}>
              <BarChart3Icon className="mr-2 size-4" />
              Analytics
            </a>
          </DropdownMenuItem>
          {canCopy && (
            <DropdownMenuItem onClick={handleDuplicateClick}>
              <CopyIcon className="mr-2 size-4" />
              Make a copy...
            </DropdownMenuItem>
          )}
          {canEdit && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/corpus/${corpus.id}/settings`}>
                  <SettingsIcon className="mr-2 size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowImportWizard(true)}>
                <FileUpIcon className="mr-2 size-4" />
                Import
              </DropdownMenuItem>
            </>
          )}
          {canManage && (
            <>
              <DropdownMenuItem onClick={handleRenameClick}>
                <EditIcon className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/corpus/${corpus.id}/access`}>
                  <UsersIcon className="mr-2 size-4" />
                  Manage access
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileDownIcon className="mr-2 size-4" />
              Export
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {exportFormatIds.map(format => (
                <DropdownMenuItem
                  key={format}
                  onClick={() => handleExportClick(format)}
                >
                  {EXPORT_FORMATS[format].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="mr-2 size-4" />
                Delete...
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportWizard
        corpusId={corpus.id}
        open={showImportWizard}
        onOpenChange={setShowImportWizard}
      />

      <ConfirmActionButton
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        action={async () => {
          await deleteCorpus(corpus.id)
          router.push('/')
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

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make a copy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              <p>
                You are about to make a copy of the corpus "
                <strong>{corpus.title}</strong>
                ".
              </p>
              {(corpus.documentsCount !== undefined || corpus.annotationsCount !== undefined) && (
                <>
                  <p className="mt-2">
                    This will copy:
                  </p>
                  <ul className="ml-4 list-inside list-disc">
                    {corpus.documentsCount !== undefined && (
                      <li>
                        {corpus.documentsCount}
                        {' '}
                        documents
                      </li>
                    )}
                    {corpus.annotationsCount !== undefined && (
                      <li>
                        {corpus.annotationsCount}
                        {' '}
                        annotations
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
            <div>
              <Label htmlFor="duplicate-corpus-owner">Owner</Label>
              <Select value={ownerSelection} onValueChange={setOwnerSelection}>
                <SelectTrigger id="duplicate-corpus-owner" className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ownedTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4">
              <Label htmlFor="duplicate-corpus-name">
                New corpus name
              </Label>
              <Input
                id="duplicate-corpus-name"
                value={newDuplicateTitle}
                onChange={e => setNewDuplicateTitle(e.target.value)}
                className="mt-1"
                placeholder="Enter a name for the new corpus"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDuplicate}
              disabled={isDuplicating || !newDuplicateTitle.trim()}
            >
              {isDuplicating ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <CopyIcon className="mr-2 size-4" />}
              {isDuplicating ? 'Making a copy...' : 'Make a copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Corpus</DialogTitle>
            <DialogDescription>
              Enter a new name for this corpus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="mt-4">
              <Label htmlFor="rename-corpus-name">
                Corpus name
              </Label>
              <Input
                id="rename-corpus-name"
                value={newRenameTitle}
                onChange={e => setNewRenameTitle(e.target.value)}
                className="mt-1"
                placeholder="Enter the new corpus name"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRename}
              disabled={isRenaming || !newRenameTitle.trim()}
            >
              {isRenaming ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <EditIcon className="mr-2 size-4" />}
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
