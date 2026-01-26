'use client'
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table as TableType,
} from '@tanstack/react-table'
import type { HTMLAttributes } from 'react'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
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
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  FilePenIcon,
  Loader2Icon,
  MoreVerticalIcon,
  Trash2Icon,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  deleteDocument,
  getRawDocumentData,
  markDocumentAsCompleted,
} from '@/actions/document/documentActions'
import { Button } from '@/components/ui/button'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Label } from './ui/label'

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
} & HTMLAttributes<HTMLDivElement>

type DataTableProps = {
  columns: ColumnDef<DocumentMetadata, any>[]
  data: DocumentMetadata[]
  filteredDocuments: DocumentMetadata[]
  setDocumentToDelete: (doc: DocumentMetadata) => void
  handleMarkCompleted: (doc: DocumentMetadata) => void
}

type DataTablePaginationProps<TData> = {
  table: TableType<TData>
}

type DocumentTableMeta = {
  filteredDocuments: DocumentMetadata[]
  handleMarkCompleted: (doc: DocumentMetadata) => void
  setDocumentToDelete: (doc: DocumentMetadata) => void
}

function DataTable({
  columns,
  data,
  filteredDocuments,
  setDocumentToDelete,
  handleMarkCompleted,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable<DocumentMetadata>({
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
      filteredDocuments,
      handleMarkCompleted,
      setDocumentToDelete,
    } satisfies DocumentTableMeta,
  })

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search documents..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="w-1/2"
        />
        <div className="flex items-center gap-1">
          <Checkbox
            id="show-only-not-completed"
            checked={(table.getColumn('completedAt')?.getFilterValue() as boolean) ?? false}
            onCheckedChange={(checked) => {
              table.getColumn('completedAt')?.setFilterValue(checked ? true : undefined)
            }}
          />
          <Label htmlFor="show-only-not-completed">
            Show only not completed
          </Label>
        </div>
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
                    <TableRow key={row.id} className="transition-colors hover:bg-muted/50">
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
                      className="h-24 text-center"
                    >
                      No documents found.
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
        {table.getFilteredRowModel().rows.length}
        {' '}
        of
        {' '}
        {table.getPreFilteredRowModel().rows.length}
        {' '}
        documents
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
              {[10, 20, 30, 40, 50].map(pageSize => (
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

// Add a function to handle downloads
async function downloadRawDocumentData(id: string, title: string) {
  try {
    const rawData = await getRawDocumentData(id)
    if (!rawData) {
      toast.error('Couldn\'t fetch document data')
      return
    }

    // Create a Blob with the JSON data
    const blob = new Blob([JSON.stringify(rawData, null, 2)], {
      type: 'application/json',
    })

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob)

    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}_raw.json`
    document.body.appendChild(a)
    a.click()

    // Clean up
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Document data downloaded successfully')
  } catch (error) {
    console.error('Error downloading document data:', error)
    toast.error('Failed to download document data')
  }
}

const columns: ColumnDef<DocumentMetadata, any>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
      <Link href={`/document/${row.original.id}`} className="block hover:underline">
        {row.original.title}
      </Link>
    ),
    filterFn: 'includesString',
  },
  {
    accessorKey: 'annotationsCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Annotations" />
    ),
    cell: ({ row }) => (
      <div>{JSON.stringify(row.original.annotationsCount)}</div>
    ),
  },
  {
    accessorKey: 'completedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Completed" />
    ),
    cell: ({ row }) => (
      <div suppressHydrationWarning>
        {row.original.completedAt?.toLocaleString() ?? 'No'}
      </div>
    ),
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === true) {
        return !row.original.completedAt
      }
      return true
    },
  },
  {
    accessorKey: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" />
    ),
    cell: ({ row, table }) => (
      <div className="flex items-center gap-2">
        <Link href={`/document/${row.original.id}`}>
          <Button variant="outline" size="sm">
            <FilePenIcon className="size-4" />
            Open
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0">
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() =>
                (table.options.meta as DocumentTableMeta)?.handleMarkCompleted(row.original)}
            >
              {row.original.completedAt
                ? (
                    <>
                      <Loader2Icon className="mr-2 size-4" />
                      Mark as not completed
                    </>
                  )
                : (
                    <>
                      <CheckCircleIcon className="mr-2 size-4" />
                      Mark as completed
                    </>
                  )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                downloadRawDocumentData(row.original.id, row.original.title)}
            >
              <DownloadIcon className="mr-2 size-4" />
              Download Raw Data
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                (table.options.meta as DocumentTableMeta)?.setDocumentToDelete(row.original)}
              className="font-bold text-red-600"
            >
              <Trash2Icon className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
]

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

export default function DocumentsTable({
  documents,
}: {
  documents: DocumentMetadata[]
}) {
  const [documentToDelete, setDocumentToDelete]
    = useState<DocumentMetadata | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleMarkCompleted = async (document: DocumentMetadata) => {
    await markDocumentAsCompleted(
      document.id,
      document.completedAt ? null : new Date(),
    )
    toast.success(
      document.completedAt
        ? 'Document marked as not completed'
        : 'Document marked as completed',
    )
  }

  const confirmDelete = async () => {
    if (!documentToDelete) {
      return
    }
    setIsDeleting(true)
    await deleteDocument(documentToDelete.id)
    setDocumentToDelete(null)
    setIsDeleting(false)
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={documents}
        filteredDocuments={documents}
        setDocumentToDelete={setDocumentToDelete}
        handleMarkCompleted={handleMarkCompleted}
      />
      <Dialog
        open={!!documentToDelete}
        onOpenChange={() => setDocumentToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600">
            <p>
              Are you sure you want to delete the document "
              <strong>{documentToDelete?.title}</strong>
              "?
            </p>
            <p>
              This action cannot be undone and will also:
            </p>
            <ul className="ml-4 list-inside list-disc">
              <li>Delete all annotations attached to this document</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  )
                : (
                    <Trash2Icon className="size-4" />
                  )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
