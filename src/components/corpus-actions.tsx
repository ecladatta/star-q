'use client'

import type { ChangeEvent, ReactNode } from 'react'
import type { CorpusOwnerInput } from '@/actions/corpus/corpusActions'
import type { Corpus } from '@/db/schema'
import type { CorpusAccess } from '@/lib/corpus-access'
import type { CorpusExportFormat } from '@/lib/exports/export-format'
import type { CorpusImportFormat } from '@/lib/imports/import-format'
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
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { deleteCorpus, duplicateCorpus, renameCorpus } from '@/actions/corpus/corpusActions'
import { importDocuments } from '@/actions/imports/importActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
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
import {
  CORPUS_EXPORT_FORMAT_IDS,
  CORPUS_EXPORT_FORMATS,
} from '@/lib/exports/export-format'
import {
  CORPUS_IMPORT_FORMAT_IDS,
  importFormatAccept,
  importFormatLabel,
  isCorpusImportFormat,
} from '@/lib/imports/import-format'

type CorpusActionsProps = {
  corpus: Corpus & { documentsCount?: number, annotationsCount?: number }
  showOpenAction?: boolean
  access: CorpusAccess
  triggerButton?: ReactNode
  ownedTeams?: { id: string, name: string, slug: string }[]
  canCopy?: boolean
}

export function CorpusActions({ corpus, showOpenAction = true, access, triggerButton, ownedTeams = [], canCopy = true }: CorpusActionsProps) {
  const canEdit = access === 'editor' || access === 'manager'
  const canManage = access === 'manager'
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)

  const [newDuplicateTitle, setNewDuplicateTitle] = useState('')
  const [newRenameTitle, setNewRenameTitle] = useState('')
  const [selectedImportFormat, setSelectedImportFormat] = useState<CorpusImportFormat | null>(null)
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null)
  const [hasImported, setHasImported] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadWarning, setUploadWarning] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [ownerSelection, setOwnerSelection] = useState(ownedTeams[0]?.id ?? '')

  const selectedOwner = (): CorpusOwnerInput => ({ teamId: ownerSelection })

  const handleImportClick = () => {
    setUploadError(null)
    setUploadWarning(null)
    setHasImported(false)
    setSelectedImportFile(null)
    setShowImportDialog(true)
  }

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedImportFile(event.target.files?.[0] ?? null)
  }

  const handleImportSubmit = async () => {
    if (!selectedImportFormat || !selectedImportFile) {
      return
    }

    try {
      setUploadError(null)
      setUploadWarning(null)
      setHasImported(false)
      setIsImporting(true)
      const formData = new FormData()
      formData.append('file', selectedImportFile)
      const { count, errors, warnings } = await importDocuments(corpus.id, selectedImportFormat, formData)
      setImportedCount(count)
      setHasImported(true)
      if (errors && errors.length > 0) {
        setUploadError(errors.join('\n'))
      }
      if (warnings && warnings.length > 0) {
        setUploadWarning(warnings.join('\n'))
      }
      router.refresh()
    } catch {
      setUploadError('Failed to upload the file. Please try again.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setSelectedImportFile(null)
    }
  }

  const handleExportClick = async (format: CorpusExportFormat) => {
    const url = `/api/corpus/${corpus.id}/export?${CORPUS_EXPORT_FORMATS[format].query}`
    const response = await fetch(url)
    if (!response.ok) {
      toast.error('Export failed. Please try again.')
      return
    }

    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition')
    const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? 'export'
    const blobUrl = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = blobUrl
    downloadLink.download = filename
    document.body.appendChild(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0)

    const skipped = Number(response.headers.get('X-QuickStatements-Skipped'))
    if (skipped > 0) {
      toast.warning(
        `${skipped} annotation${skipped === 1 ? '' : 's'} skipped. Only Wikidata-linked statements were exported.`,
      )
    }
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
              <DropdownMenuItem onClick={handleImportClick}>
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
              {CORPUS_EXPORT_FORMAT_IDS.map(format => (
                <DropdownMenuItem
                  key={format}
                  onClick={() => handleExportClick(format)}
                >
                  {CORPUS_EXPORT_FORMATS[format].label}
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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Documents</DialogTitle>
            <DialogDescription>
              {isImporting
                ? 'Please wait while your documents are being imported. This may take a few moments.'
                : hasImported
                  ? 'Import complete.'
                  : 'Select the dataset format and a file to import.'}
            </DialogDescription>
          </DialogHeader>
          {isImporting
            ? (
                <div className="flex items-center space-x-2">
                  <Loader2Icon className="size-8 animate-spin" />
                  <span>Importing...</span>
                </div>
              )
            : hasImported && uploadError
              ? (
                  <div className="mb-2 max-h-48 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/10 p-2">
                    <p className="whitespace-pre-line text-destructive">{uploadError}</p>
                  </div>
                )
              : hasImported && uploadWarning
                ? (
                    <div className="mb-2 max-h-48 overflow-y-auto rounded-md border border-warning bg-warning/40 p-2">
                      <p className="font-medium text-warning-foreground">Import completed with warnings:</p>
                      <p className="whitespace-pre-line text-warning-foreground">{uploadWarning}</p>
                    </div>
                  )
                : hasImported
                  ? (
                      <>
                        {importedCount}
                        {' '}
                        documents imported successfully!
                      </>
                    )
                  : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="import-format">Dataset format</Label>
                          <Select
                            value={selectedImportFormat ?? ''}
                            onValueChange={(value) => {
                              setSelectedImportFormat(isCorpusImportFormat(value) ? value : null)
                            }}
                          >
                            <SelectTrigger id="import-format" className="mt-1 w-full">
                              <SelectValue placeholder="Select a format" />
                            </SelectTrigger>
                            <SelectContent>
                              {CORPUS_IMPORT_FORMAT_IDS.map(format => (
                                <SelectItem key={format} value={format}>
                                  {importFormatLabel(format)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>File</Label>
                          <div className="mt-1">
                            {selectedImportFile
                              ? (
                                  <div className="flex items-center justify-between rounded-md border border-dashed border-gray-300 p-3">
                                    <div className="flex items-center space-x-2">
                                      <FileUpIcon className="size-4 text-gray-500" />
                                      <span className="text-sm text-gray-700">{selectedImportFile.name}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedImportFile(null)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )
                              : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    disabled={!selectedImportFormat}
                                    onClick={() => fileInputRef.current?.click()}
                                  >
                                    <FileUpIcon className="mr-2 size-4" />
                                    Choose file
                                  </Button>
                                )}
                          </div>
                        </div>
                      </div>
                    )}
          <DialogFooter>
            {isImporting
              ? null
              : hasImported
                ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        router.push(`/corpus/${corpus.id}`)
                        setShowImportDialog(false)
                      }}
                    >
                      View documents
                    </Button>
                  )
                : (
                    <Button
                      onClick={handleImportSubmit}
                      disabled={!selectedImportFormat || !selectedImportFile}
                    >
                      <FileUpIcon className="mr-2 size-4" />
                      Import
                    </Button>
                  )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
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

      {/* Duplicate Dialog */}
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

      {/* Rename Dialog */}
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

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept={selectedImportFormat ? importFormatAccept(selectedImportFormat) : undefined}
        onChange={handleImportFileChange}
      />
    </>
  )
}
