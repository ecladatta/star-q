'use client'
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table as TableType,
} from '@tanstack/react-table'
import type { ChangeEvent, HTMLAttributes } from 'react'
import type { CorpusListItem, CorpusOwnerInput } from '@/actions/corpus/corpusActions'
import type { CorpusImportFormat } from '@/lib/imports/import-format'
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
  Globe,
  Loader2Icon,
  MoreVerticalIcon,
  PlusCircleIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { addCorpus } from '@/actions/corpus/corpusActions'
import { createCorpusWithDocumentsImport } from '@/actions/imports/importActions'
import { CorpusActions } from '@/components/corpus-actions'
import { Page, PageHeader } from '@/components/page'
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
import {
  CORPUS_IMPORT_FORMAT_IDS,
  importFormatAccept,
  importFormatLabel,
  isCorpusImportFormat,
} from '@/lib/imports/import-format'
import { cn } from '@/lib/utils'

export type CorporaProps = {
  corpora: CorpusListItem[]
  canCreate: boolean
  canCopy?: boolean
  ownedTeams: { id: string, name: string, slug: string }[]
  title?: string
  description?: string
}

type CorpusWithCounts = CorpusListItem

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
} & HTMLAttributes<HTMLDivElement>

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
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

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
          placeholder="Search corpora..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-1/2"
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="h-auto px-3 py-2 text-xs font-medium text-muted-foreground"
                  >
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
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="px-3 py-2.5 text-[13px]">
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
                      No corpora found.
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
    <div className="flex flex-col gap-2 px-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground sm:flex-1">
        {table.getFilteredSelectedRowModel().rows.length}
        {' '}
        of
        {' '}
        {table.getFilteredRowModel().rows.length}
        {' '}
        row(s) shown.
      </div>
      <div className="flex items-center space-x-4 sm:space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="hidden text-sm font-medium sm:block">Rows per page</p>
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
            className="-ml-3 h-8 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc'
              ? (
                  <ArrowDownIcon className="size-3" />
                )
              : column.getIsSorted() === 'asc'
                ? (
                    <ArrowUpIcon className="size-3" />
                  )
                : (
                    <ChevronsUpDownIcon className="size-3" />
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

function buildColumns(ownedTeams: { id: string, name: string, slug: string }[], canCopy: boolean): ColumnDef<CorpusWithCounts, any>[] {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Corpus Name" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/corpus/${row.original.id}`}
          className="block font-medium text-foreground hover:text-accent hover:underline"
        >
          {row.original.title}
        </Link>
      ),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'ownerIdentifier',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Owner" />
      ),
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.original.ownerName ?? row.original.ownerIdentifier ?? 'Setup pending'}
        </div>
      ),
    },
    {
      accessorKey: 'documentsCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Documents" />
      ),
      cell: ({ row }) => (
        <div className="font-mono text-muted-foreground tabular-nums">{row.original.documentsCount}</div>
      ),
    },
    {
      accessorKey: 'annotationsCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Annotations" />
      ),
      cell: ({ row }) => (
        <div className="font-mono text-muted-foreground tabular-nums">{row.original.annotationsCount}</div>
      ),
    },
    {
      accessorKey: 'actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Actions" />
      ),
      cell: ({ row }) => (
        <CorpusActions
          corpus={row.original}
          showOpenAction
          access={row.original.access}
          ownedTeams={ownedTeams}
          canCopy={canCopy}
          triggerButton={(
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVerticalIcon className="size-4" />
            </Button>
          )}
        />
      ),
    },
  ]
}

export function Corpora({ corpora, canCreate, canCopy = true, ownedTeams, title = 'Corpus Management', description = 'Create and manage your document collections' }: CorporaProps) {
  const newCorpusFileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [newCorpusName, setNewCorpusName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showNewCorpusDialog, setShowNewCorpusDialog] = useState(false)
  const [newCorpusFile, setNewCorpusFile] = useState<File | null>(null)
  const [newCorpusFormat, setNewCorpusFormat] = useState<CorpusImportFormat | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadWarning, setUploadWarning] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [newCorpusId, setNewCorpusId] = useState<string | null>(null)
  const [ownerSelection, setOwnerSelection] = useState(ownedTeams[0]?.id ?? '')

  const selectedOwner = (): CorpusOwnerInput => ({ teamId: ownerSelection })

  const handleCreateCorpusWithFileImport = async (file: File, format: CorpusImportFormat) => {
    try {
      setUploadError(null)
      setUploadWarning(null)
      setShowImportDialog(true)
      setIsImporting(true)
      setNewCorpusId(null)
      const formData = new FormData()
      formData.append('file', file)
      const { count, errors, warnings, corpusId } = await createCorpusWithDocumentsImport(newCorpusName, format, selectedOwner(), formData)
      setImportedCount(count)
      setNewCorpusId(corpusId)
      if (errors && errors.length > 0) {
        setUploadError(errors.join('\n'))
      }
      if (warnings && warnings.length > 0) {
        setUploadWarning(warnings.join('\n'))
      }
    } catch {
      setUploadError('Failed to upload the file. Please try again.')
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

      if (newCorpusFile && newCorpusFormat) {
        await handleCreateCorpusWithFileImport(newCorpusFile, newCorpusFormat)
      } else {
        await addCorpus(newCorpusName, selectedOwner())
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

  const handleNewCorpusFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setNewCorpusFile(file || null)
  }

  const removeNewCorpusFile = () => {
    setNewCorpusFile(null)
    if (newCorpusFileInputRef.current) {
      newCorpusFileInputRef.current.value = ''
    }
  }

  const tableColumns = useMemo(() => buildColumns(ownedTeams, canCopy), [ownedTeams, canCopy])

  return (
    <Page>
      <PageHeader title={title} description={description}>
        {canCreate && (
          <Button onClick={() => setShowNewCorpusDialog(true)}>
            <PlusCircleIcon className="mr-2 size-4" />
            New Corpus
          </Button>
        )}
      </PageHeader>

      {corpora.length > 0
        ? (
            <DataTable
              columns={tableColumns}
              data={corpora}
            />
          )
        : (
            <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No corpora available.
              </p>
              <p className="text-sm text-muted-foreground">
                {canCreate
                  ? 'Create your first corpus to get started, or explore corpora shared publicly.'
                  : 'There are no public corpora to view yet.'}
              </p>
              {canCreate && (
                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={() => setShowNewCorpusDialog(true)}>
                    <PlusCircleIcon className="mr-2 size-4" />
                    New Corpus
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/explore">
                      <Globe className="mr-2 size-4" />
                      Explore public corpora
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

      {/* New Corpus Dialog */}
      <Dialog open={showNewCorpusDialog} onOpenChange={setShowNewCorpusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Corpus</DialogTitle>
            <DialogDescription>
              Enter a name for your new document collection. Optionally, you can import documents during creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-corpus-owner">Owner</Label>
              <Select value={ownerSelection} onValueChange={setOwnerSelection}>
                <SelectTrigger id="new-corpus-owner" className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ownedTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <div>
                  <Select
                    value={newCorpusFormat ?? ''}
                    onValueChange={(value) => {
                      setNewCorpusFormat(isCorpusImportFormat(value) ? value : null)
                    }}
                  >
                    <SelectTrigger id="new-corpus-import-format" className="mt-1 w-full">
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
                        disabled={!newCorpusFormat}
                        onClick={handleNewCorpusFileSelect}
                      >
                        <FileUpIcon className="mr-2 size-4" />
                        Select file to import
                      </Button>
                    )}
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
        <DialogContent className="sm:max-w-md">
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
              <div className="mb-2 max-h-48 overflow-y-auto rounded-sm border border-red-200 bg-red-50 p-2">
                <p className="whitespace-pre-line text-red-500">{uploadError}</p>
              </div>
            )}
            {!isImporting && uploadWarning && (
              <div className="mb-2 max-h-48 overflow-y-auto rounded-sm border border-yellow-200 bg-yellow-50 p-2">
                <p className="font-medium text-yellow-700">Import completed with warnings:</p>
                <p className="whitespace-pre-line text-yellow-700">{uploadWarning}</p>
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
        accept={newCorpusFormat ? importFormatAccept(newCorpusFormat) : undefined}
        onChange={handleNewCorpusFileChange}
      />
    </Page>
  )
}
