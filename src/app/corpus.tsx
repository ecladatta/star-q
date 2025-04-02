'use client'
import type { Corpus } from '@/db/schema'
import { addCorpus, deleteCorpus } from '@/actions/corpus/corpusActions'
import { importDocuments } from '@/actions/imports/importActions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InvalidJsonLinesError, UnsupportedFileTypeError } from '@/lib/utils'
import { FileDown, FileUp, FolderOpen, Loader2, PlusCircle, Trash2 } from 'lucide-react'
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
  const [corpusToDelete, setCorpusToDelete] = useState<Corpus | null>()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [corpusToImport, setCorpusToImport] = useState<Corpus | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  const handleImportClick = (corpus: Corpus) => {
    setCorpusToImport(corpus)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    try {
      if (file && corpusToImport) {
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
        setUploadError('Unsupported file type. Please upload a JSON file.')
      } else if (err instanceof InvalidJsonLinesError) {
        setUploadError('Invalid JSON lines format. Please check the file and try again.')
      } else {
        setUploadError('Failed to upload the file. Please try again.')
      }
    } finally {
      setIsImporting(false)
      fileInputRef.current!.value = ''
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
                      <Loader2 className="size-4 animate-spin" />
                    )
                  : (
                      <PlusCircle className="size-4" />
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
                      <TableRow key={corpus.id}>
                        <TableCell>{corpus.title}</TableCell>
                        <TableCell>{corpus.documentsCount}</TableCell>
                        <TableCell>{corpus.annotationsCount}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Link href={`/corpus/${corpus.id}`}>
                              <Button variant="outline" size="sm">
                                <FolderOpen className="size-4" />
                                {' '}
                                Open
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => handleImportClick(corpus)}>
                              <FileUp className="size-4" />
                              {' '}
                              Import
                            </Button>
                            <input
                              type="file"
                              ref={fileInputRef}
                              style={{ display: 'none' }}
                              onChange={handleFileChange}
                            />
                            <Button variant="outline" size="sm" onClick={() => handleExportClick(corpus)}>
                              <FileDown className="size-4" />
                              {' '}
                              Export
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(corpus)}
                              disabled={isDeleting && corpusToDelete?.id === corpus.id}
                            >
                              {isDeleting && corpusToDelete?.id === corpus.id
                                ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  )
                                : (
                                    <Trash2 className="size-4" />
                                  )}
                              {' '}
                              Delete
                            </Button>
                          </div>
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
            <DialogDescription>
            </DialogDescription>
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
            <DialogDescription>
              Are you sure you want to delete the corpus "
              <strong>{corpusToDelete?.title}</strong>
              "?
              <br />
              This action cannot be undone and will also:
              <ul className="ml-4 list-inside list-disc">
                <li>Delete all documents attached to this corpus</li>
                <li>Delete all annotations attached to this corpus</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorpusToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
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
                <Loader2 className="size-8 animate-spin" />
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
    </main>
  )
}
