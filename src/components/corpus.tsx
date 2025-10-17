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
  FileUpIcon,
  Loader2Icon,
  PlusCircleIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import * as React from 'react'
import { addCorpus } from '@/actions/corpus/corpusActions'
import { importDocuments } from '@/actions/imports/importActions'
import { CorpusActions } from '@/components/corpus-actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
}

type DataTablePaginationProps<TData> = {
  table: TableType<TData>
}

function DataTable({
  columns,
  data,
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
    cell: ({ row }) => (
      <CorpusActions corpus={row.original} showOpenAction />
    ),
  },
]

export function Corpuses({ corpuses }: CorpusesProps) {
  const newCorpusFileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [newCorpusName, setNewCorpusName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showNewCorpusDialog, setShowNewCorpusDialog] = useState(false)
  const [newCorpusFile, setNewCorpusFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [newCorpusId, setNewCorpusId] = useState<string | null>(null)

  const handleFileImport = async (file: File, targetCorpusId: string) => {
    try {
      setUploadError(null)
      setShowImportDialog(true)
      setIsImporting(true)
      const formData = new FormData()
      formData.append('file', file)
      const { count, errors } = await importDocuments(targetCorpusId, formData)
      setImportedCount(count)
      setNewCorpusId(targetCorpusId)
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

      {/* Import Status Dialog - Only for new corpus creation */}
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
            {!isImporting && newCorpusId && (
              <Button
                variant="outline"
                onClick={() => {
                  router.push(`/corpus/${newCorpusId}`)
                }}
              >
                View documents
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for new corpus creation */}
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
