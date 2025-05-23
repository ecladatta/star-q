'use client'
import type { Corpus } from '@/db/schema'
import { addCorpus, deleteCorpus, duplicateCorpus } from '@/actions/corpus/corpusActions'
import { importDocuments } from '@/actions/imports/importActions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InvalidJsonLinesError, UnsupportedFileTypeError } from '@/lib/utils'
import { CopyIcon, FileDownIcon, FileUpIcon, FolderOpenIcon, Loader2Icon, MoreHorizontalIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

export type CorpusesProps = {
  corpuses: (Corpus & { documentsCount: number, annotationsCount: number })[]
}

export function Corpuses({ corpuses }: CorpusesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [newCorpusName, setNewCorpusName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [corpusToDelete, setCorpusToDelete] = useState<Corpus | null>()
  const [corpusToDuplicate, setCorpusToDuplicate] = useState<(Corpus & { documentsCount: number, annotationsCount: number }) | null>(null)
  const [newDuplicateTitle, setNewDuplicateTitle] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [corpusToImport, setCorpusToImport] = useState<Corpus | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  const handleImportClick = (corpus: Corpus) => {
    setCorpusToImport(corpus)
    setUploadError(null)
    // Reset the file input value to ensure change event fires even for the same file
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
      if (corpusToImport) {
        setUploadError(null)
        setShowImportDialog(true)
        setIsImporting(true)
        const formData = new FormData()
        formData.append('file', file)
        const { count } = await importDocuments(corpusToImport.id, formData)
        setImportedCount(count)
      }
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
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExportClick = async (corpus: Corpus) => {
    setIsExporting(true)
    try {
      window.open(`/api/corpus/${corpus.id}/export`, '_blank')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteClick = (corpus: Corpus) => {
    setCorpusToDelete(corpus)
  }

  const confirmDelete = async () => {
    if (!corpusToDelete) {
      return
    }
    setIsDeleting(true)
    await deleteCorpus(corpusToDelete.id)
    setCorpusToDelete(null)
    setIsDeleting(false)
  }

  const handleDuplicateClick = (corpus: Corpus & { documentsCount: number, annotationsCount: number }) => {
    setCorpusToDuplicate(corpus)
    setNewDuplicateTitle(`${corpus.title} (copy)`)
  }

  const confirmDuplicate = async () => {
    if (!corpusToDuplicate || !newDuplicateTitle.trim()) {
      return
    }
    try {
      setIsDuplicating(true)
      await duplicateCorpus(corpusToDuplicate.id, newDuplicateTitle)
      setCorpusToDuplicate(null)
      setNewDuplicateTitle('')
      router.refresh()
    } catch (error) {
      console.error('Duplication failed:', error)
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <main className="ml-0 min-w-0">
      <div className="container mx-auto p-12">
        <div className="flex flex-col">
          <h2 className="mb-4 text-2xl font-semibold">Corpus Management</h2>
          <div className="mb-4">
            <form
              className="flex space-x-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (newCorpusName.trim()) {
                  setIsAdding(true)
                  await addCorpus(newCorpusName)
                  setNewCorpusName('')
                  setIsAdding(false)
                }
              }}
            >
              <Input
                placeholder="New corpus name"
                className="max-w-xs"
                value={newCorpusName}
                onChange={e => setNewCorpusName(e.target.value)}
                required
              />
              <Button
                type="submit"
                disabled={!newCorpusName.trim() || isAdding}
              >
                {isAdding
                  ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    )
                  : (
                      <PlusCircleIcon className="size-4" />
                    )}
                {' '}
                {isAdding ? 'Creating corpus..' : 'Create Corpus'}
              </Button>
            </form>
          </div>
          {corpuses.length > 0
            ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corpus Name</TableHead>
                      <TableHead>Document Count</TableHead>
                      <TableHead>Annotation Count</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {corpuses.map(corpus => (
                      <TableRow
                        key={corpus.id}
                        className="group hover:bg-muted/50"
                      >
                        <TableCell className="p-0">
                          <Link href={`/corpus/${corpus.id}`} className="block size-full p-4">
                            {corpus.title}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0">
                          <Link href={`/corpus/${corpus.id}`} className="block size-full p-4">
                            {corpus.documentsCount}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0">
                          <Link href={`/corpus/${corpus.id}`} className="block size-full p-4">
                            {corpus.annotationsCount}
                          </Link>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={`/corpus/${corpus.id}`}>
                                  <FolderOpenIcon className="mr-2 size-4" />
                                  Open
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicateClick(corpus)}
                                disabled={isDuplicating}
                              >
                                <CopyIcon className="mr-2 size-4" />
                                {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleImportClick(corpus)}>
                                <FileUpIcon className="mr-2 size-4" />
                                Import
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportClick(corpus)}>
                                <FileDownIcon className="mr-2 size-4" />
                                Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(corpus)}
                                disabled={isDeleting && corpusToDelete?.id === corpus.id}
                                className="text-red-600 focus:text-red-600"
                              >
                                {isDeleting && corpusToDelete?.id === corpus.id
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            : (
                <p className="mt-8 text-center text-sm text-gray-500">
                  No corpuses available.
                </p>
              )}
        </div>
      </div>
      <Dialog open={isExporting} onOpenChange={setIsExporting}>
        <DialogContent className="m-0 size-full max-w-full p-0 sm:h-auto sm:max-w-[800px] sm:rounded-lg sm:p-6 sm:shadow-lg">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Exporting documents...</h2>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExporting(false)}>Cancel</Button>
            <Button type="submit" disabled={isExporting}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!corpusToDelete} onOpenChange={() => setCorpusToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600">
            <p>
              Are you sure you want to delete the corpus "
              <strong>{corpusToDelete?.title}</strong>
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
            <Button variant="outline" onClick={() => setCorpusToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            {uploadError && <p className="text-red-500">{uploadError}</p>}
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
                  router.push(`/corpus/${corpusToImport?.id}`)
                }}
              >
                View documents
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!corpusToDuplicate} onOpenChange={open => !open && setCorpusToDuplicate(null)}>
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
                <strong>{corpusToDuplicate?.title}</strong>
                ".
              </p>
              <p className="mt-2">
                This will copy:
              </p>
              <ul className="ml-4 list-inside list-disc">
                <li>
                  {corpusToDuplicate?.documentsCount}
                  {' '}
                  documents
                </li>
                <li>
                  {corpusToDuplicate?.annotationsCount}
                  {' '}
                  annotations
                </li>
              </ul>
            </div>
            <div className="mt-4">
              <label htmlFor="new-corpus-name" className="block text-sm font-medium text-gray-700">
                New corpus name
              </label>
              <Input
                id="new-corpus-name"
                value={newDuplicateTitle}
                onChange={e => setNewDuplicateTitle(e.target.value)}
                className="mt-1"
                placeholder="Enter a name for the new corpus"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorpusToDuplicate(null)}>Cancel</Button>
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
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json,.jsonl,.zip"
        onChange={handleFileChange}
      />
    </main>
  )
}
