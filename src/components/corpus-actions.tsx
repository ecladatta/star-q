'use client'

import type { Corpus } from '@/db/schema'
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
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { deleteCorpus, duplicateCorpus, renameCorpus } from '@/actions/corpus/corpusActions'
import { importDocuments } from '@/actions/imports/importActions'
import { CorpusSettingsDialog } from '@/components/corpus-settings-dialog'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InvalidJsonLinesError, UnsupportedFileTypeError } from '@/lib/utils'

type CorpusActionsProps = {
  corpus: Corpus & { documentsCount?: number, annotationsCount?: number }
  showOpenAction?: boolean
  triggerButton?: React.ReactNode
}

export function CorpusActions({ corpus, showOpenAction = true, triggerButton }: CorpusActionsProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  const [newDuplicateTitle, setNewDuplicateTitle] = useState('')
  const [newRenameTitle, setNewRenameTitle] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  const handleImportClick = () => {
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 0)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      setUploadError(null)
      setShowImportDialog(true)
      setIsImporting(true)
      const formData = new FormData()
      formData.append('file', file)
      const { count, errors } = await importDocuments(corpus.id, formData)
      setImportedCount(count)
      if (errors && errors.length > 0) {
        setUploadError(errors.join('\n'))
      }
      router.refresh()
    } catch (err) {
      if (err instanceof UnsupportedFileTypeError) {
        setUploadError('Unsupported file type. Please upload a JSON or ZIP file.')
      } else if (err instanceof InvalidJsonLinesError) {
        setUploadError('Invalid JSON lines format. Please check the file and try again.')
      } else {
        setUploadError('Failed to upload the file. Please try again.')
      }
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExportClick = async () => {
    try {
      window.open(`/api/corpus/${corpus.id}/export`, '_blank')
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    await deleteCorpus(corpus.id)
    setShowDeleteDialog(false)
    setIsDeleting(false)
    router.push('/')
    router.refresh()
  }

  const handleDuplicateClick = () => {
    setNewDuplicateTitle(`${corpus.title} (copy)`)
    setShowDuplicateDialog(true)
  }

  const confirmDuplicate = async () => {
    if (!newDuplicateTitle.trim()) {
      return
    }
    try {
      setIsDuplicating(true)
      await duplicateCorpus(corpus.id, newDuplicateTitle)
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
    } catch (error) {
      console.error('Rename failed:', error)
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
        <DropdownMenuContent align="end">
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
          <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
            <SettingsIcon className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRenameClick}>
            <EditIcon className="mr-2 size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicateClick}>
            <CopyIcon className="mr-2 size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImportClick}>
            <FileUpIcon className="mr-2 size-4" />
            Import
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportClick}>
            <FileDownIcon className="mr-2 size-4" />
            Export
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="text-red-600 focus:text-red-600"
          >
            {isDeleting
              ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                )
              : (
                  <Trash2Icon className="mr-2 size-4" />
                )}
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Documents</DialogTitle>
            <DialogDescription>
              {isImporting && <>Please wait while your documents are being imported. This may take a few moments.</>}
            </DialogDescription>
          </DialogHeader>
          <div>
            {isImporting && (
              <div className="flex items-center space-x-2">
                <Loader2Icon className="size-8 animate-spin" />
                <span>Importing...</span>
              </div>
            )}
            {!isImporting && uploadError && (
              <div className="mb-2 max-h-48 overflow-y-auto rounded border border-red-200 bg-red-50 p-2">
                <p className="whitespace-pre-line text-red-500">{uploadError}</p>
              </div>
            )}
            {!isImporting && !uploadError && (
              <>
                {importedCount}
                {' '}
                documents imported successfully!
              </>
            )}
          </div>
          <DialogFooter>
            {!isImporting && (
              <Button
                variant="outline"
                onClick={() => {
                  router.push(`/corpus/${corpus.id}`)
                  setShowImportDialog(false)
                }}
              >
                View documents
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600">
            <p>
              Are you sure you want to delete the corpus "
              <strong>{corpus.title}</strong>
              "?
            </p>
            <p>
              This action cannot be undone and will also:
            </p>
            <ul className="ml-4 list-inside list-disc">
              <li>Delete all documents attached to this corpus</li>
              <li>Delete all annotations attached to this corpus</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Corpus</DialogTitle>
            <DialogDescription>
              Create a copy of this corpus with all its documents and annotations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-gray-600">
              <p>
                You are about to duplicate the corpus "
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
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
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

      {/* Settings Dialog */}
      <CorpusSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        corpus={corpus}
      />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json,.jsonl,.zip"
        onChange={handleFileChange}
      />
    </>
  )
}
