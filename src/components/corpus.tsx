'use client'
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table as TableType,
} from '@tanstack/react-table'
import type { Corpus } from '@/db/schema'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  EditIcon,
  FileDownIcon,
  FilePenIcon,
  FileUpIcon,
  FolderOpenIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusCircleIcon,
  Trash2Icon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import * as React from 'react'
import { addCorpus, deleteCorpus, duplicateCorpus, renameCorpus } from '@/actions/corpus/corpusActions'
import { importDocuments } from '@/actions/imports/importActions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn, InvalidJsonLinesError, UnsupportedFileTypeError } from '@/lib/utils'

export type CorpusesProps = {
  corpuses: (Corpus & { documentsCount: number, annotationsCount: number })[]
}

type CorpusWithCounts = Corpus & { documentsCount: number, annotationsCount: number }

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
} & React.HTMLAttributes<HTMLDivElement>

type DataTableProps = {
  columns: ColumnDef<CorpusWithCounts, any>[]
  data: CorpusWithCounts[]
  handleRenameClick: (corpus: Corpus) => void
  handleDuplicateClick: (corpus: CorpusWithCounts) => void
  handleImportClick: (corpus: Corpus) => void
  handleExportClick: (corpus: Corpus) => void
  handleDeleteClick: (corpus: Corpus) => void
  isDeleting: boolean
  corpusToDelete: Corpus | null
}

type DataTablePaginationProps<TData> = {
  table: TableType<TData>
}

type CorpusTableMeta = {
  handleRenameClick: (corpus: Corpus) => void
  handleDuplicateClick: (corpus: CorpusWithCounts) => void
  handleImportClick: (corpus: Corpus) => void
  handleExportClick: (corpus: Corpus) => void
  handleDeleteClick: (corpus: Corpus) => void
  isDeleting: boolean
  corpusToDelete: Corpus | null
}

function DataTable({
  columns,
  data,
  handleRenameClick,
  handleDuplicateClick,
  handleImportClick,
  handleExportClick,
  handleDeleteClick,
  isDeleting,
  corpusToDelete,
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable<CorpusWithCounts>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    meta: {
      handleRenameClick,
      handleDuplicateClick,
      handleImportClick,
      handleExportClick,
      handleDeleteClick,
      isDeleting,
      corpusToDelete,
    } satisfies CorpusTableMeta,
  })

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search corpuses..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-1/2"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length
              ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} className="group hover:bg-muted/50">
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )
              : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No corpuses found.
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </div>
      <div className="py-2">
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}

function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length}
        {' '}
        of
        {' '}
        {table.getFilteredRowModel().rows.length}
        {' '}
        row(s) shown.
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map(pageSize => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page
          {' '}
          {table.getState().pagination.pageIndex + 1}
          {' '}
          of
          {' '}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc'
              ? (
                  <ArrowDownIcon />
                )
              : column.getIsSorted() === 'asc'
                ? (
                    <ArrowUpIcon />
                  )
                : (
                    <ChevronsUpDownIcon />
                  )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="size-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="size-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const columns: ColumnDef<CorpusWithCounts, any>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Corpus Name" />
    ),
    cell: ({ row }) => (
      <Link href={`/corpus/${row.original.id}`} className="block hover:underline">
        {row.original.title}
      </Link>
    ),
    filterFn: 'includesString',
  },
  {
    accessorKey: 'documentsCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Documents" />
    ),
    cell: ({ row }) => (
      <div>{row.original.documentsCount}</div>
    ),
  },
  {
    accessorKey: 'annotationsCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Annotations" />
    ),
    cell: ({ row }) => (
      <div>{row.original.annotationsCount}</div>
    ),
  },
  {
    accessorKey: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" />
    ),
    cell: ({ row, table }) => (
      <>
        <Link href={`/corpus/${row.original.id}`}>
          <Button variant="outline" size="sm">
            <FilePenIcon className="size-4" />
            Open
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={`/corpus/${row.original.id}`}>
                <FolderOpenIcon className="mr-2 size-4" />
                Open
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => (table.options.meta as CorpusTableMeta)?.handleRenameClick(row.original)}
            >
              <EditIcon className="mr-2 size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => (table.options.meta as CorpusTableMeta)?.handleDuplicateClick(row.original)}
            >
              <CopyIcon className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => (table.options.meta as CorpusTableMeta)?.handleImportClick(row.original)}>
              <FileUpIcon className="mr-2 size-4" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => (table.options.meta as CorpusTableMeta)?.handleExportClick(row.original)}>
              <FileDownIcon className="mr-2 size-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => (table.options.meta as CorpusTableMeta)?.handleDeleteClick(row.original)}
              disabled={(table.options.meta as CorpusTableMeta)?.isDeleting && (table.options.meta as CorpusTableMeta)?.corpusToDelete?.id === row.original.id}
              className="text-red-600 focus:text-red-600"
            >
              {(table.options.meta as CorpusTableMeta)?.isDeleting && (table.options.meta as CorpusTableMeta)?.corpusToDelete?.id === row.original.id
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
      </>
    ),
  },
]

export function Corpuses({ corpuses }: CorpusesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newCorpusFileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [newCorpusName, setNewCorpusName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showNewCorpusDialog, setShowNewCorpusDialog] = useState(false)
  const [newCorpusFile, setNewCorpusFile] = useState<File | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [corpusToDelete, setCorpusToDelete] = useState<Corpus | null>(null)
  const [corpusToDuplicate, setCorpusToDuplicate] = useState<(Corpus & { documentsCount: number, annotationsCount: number }) | null>(null)
  const [newDuplicateTitle, setNewDuplicateTitle] = useState('')
  const [corpusToRename, setCorpusToRename] = useState<Corpus | null>(null)
  const [newRenameTitle, setNewRenameTitle] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [corpusToImport, setCorpusToImport] = useState<Corpus | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  // Shared file import logic
  const handleFileImport = async (file: File, targetCorpusId: string) => {
    try {
      setUploadError(null)
      setShowImportDialog(true)
      setIsImporting(true)
      const formData = new FormData()
      formData.append('file', file)
      const { count, errors } = await importDocuments(targetCorpusId, formData)
      setImportedCount(count)
      setCorpusToImport({ id: targetCorpusId } as Corpus)
      if (errors && errors.length > 0) {
        setUploadError(errors.join('\n'))
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
    }
  }

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
    if (!file || !corpusToImport) {
      return
    }

    await handleFileImport(file, corpusToImport.id)

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

  const handleRenameClick = (corpus: Corpus) => {
    setCorpusToRename(corpus)
    setNewRenameTitle(corpus.title || '')
  }

  const confirmRename = async () => {
    if (!corpusToRename || !newRenameTitle.trim()) {
      return
    }
    try {
      setIsRenaming(true)
      await renameCorpus(corpusToRename.id, newRenameTitle)
      setCorpusToRename(null)
      setNewRenameTitle('')
      router.refresh()
    } catch (error) {
      console.error('Rename failed:', error)
    } finally {
      setIsRenaming(false)
    }
  }

  const handleCreateCorpus = async () => {
    if (!newCorpusName.trim()) {
      return
    }
    try {
      setIsAdding(true)
      const result = await addCorpus(newCorpusName)

      // If there's a file to import, import it to the new corpus
      if (newCorpusFile && result?.id) {
        await handleFileImport(newCorpusFile, result.id)
      }

      setNewCorpusName('')
      setNewCorpusFile(null)
      setShowNewCorpusDialog(false)
      router.refresh()
    } catch (error) {
      console.error('Create corpus failed:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleNewCorpusFileSelect = () => {
    if (newCorpusFileInputRef.current) {
      newCorpusFileInputRef.current.value = ''
      newCorpusFileInputRef.current.click()
    }
  }

  const handleNewCorpusFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setNewCorpusFile(file || null)
  }

  const removeNewCorpusFile = () => {
    setNewCorpusFile(null)
    if (newCorpusFileInputRef.current) {
      newCorpusFileInputRef.current.value = ''
    }
  }

  return (
    <main className="ml-0 min-w-0">
      <div className="container mx-auto flex size-full min-h-screen max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Corpus Management</h1>
              <p className="text-sm text-muted-foreground">
                Create and manage your document collections
              </p>
            </div>
            <Button onClick={() => setShowNewCorpusDialog(true)}>
              <PlusCircleIcon className="mr-2 size-4" />
              New Corpus
            </Button>
          </div>
        </div>

        {/* Data table */}
        {corpuses.length > 0
          ? (
              <DataTable
                columns={columns}
                data={corpuses}
                handleRenameClick={handleRenameClick}
                handleDuplicateClick={handleDuplicateClick}
                handleImportClick={handleImportClick}
                handleExportClick={handleExportClick}
                handleDeleteClick={handleDeleteClick}
                isDeleting={isDeleting}
                corpusToDelete={corpusToDelete}
              />
            )
          : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg text-muted-foreground">
                  No corpuses available.
                </p>
                <p className="text-sm text-muted-foreground">
                  Create your first corpus to get started.
                </p>
              </div>
            )}
      </div>

      {/* New Corpus Dialog */}
      <Dialog open={showNewCorpusDialog} onOpenChange={setShowNewCorpusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Corpus</DialogTitle>
            <DialogDescription>
              Enter a name for your new document collection. Optionally, you can import documents during creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-corpus-name-input">
                Corpus name
              </Label>
              <Input
                id="new-corpus-name-input"
                value={newCorpusName}
                onChange={e => setNewCorpusName(e.target.value)}
                className="mt-1"
                placeholder="Enter corpus name"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateCorpus()
                  }
                }}
              />
            </div>

            <div>
              <Label>Import documents (optional)</Label>
              <div className="mt-1 space-y-2">
                {newCorpusFile
                  ? (
                      <div className="flex items-center justify-between rounded-md border border-dashed border-gray-300 p-3">
                        <div className="flex items-center space-x-2">
                          <FileUpIcon className="size-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{newCorpusFile.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeNewCorpusFile}
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
                        onClick={handleNewCorpusFileSelect}
                      >
                        <FileUpIcon className="mr-2 size-4" />
                        Select file to import
                      </Button>
                    )}
                <p className="text-xs text-gray-500">
                  Supported formats: JSON, JSONL, ZIP files
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCorpusDialog(false)
                setNewCorpusName('')
                setNewCorpusFile(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCorpus}
              disabled={isAdding || !newCorpusName.trim()}
            >
              {isAdding ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <PlusCircleIcon className="mr-2 size-4" />}
              {isAdding ? 'Creating...' : 'Create Corpus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="new-corpus-name">
                New corpus name
              </Label>
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
      <Dialog open={!!corpusToRename} onOpenChange={open => !open && setCorpusToRename(null)}>
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
            <Button variant="outline" onClick={() => setCorpusToRename(null)}>Cancel</Button>
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
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json,.jsonl,.zip"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={newCorpusFileInputRef}
        style={{ display: 'none' }}
        accept=".json,.jsonl,.zip"
        onChange={handleNewCorpusFileChange}
      />
    </main>
  )
}
