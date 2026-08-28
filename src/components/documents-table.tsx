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
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  deleteDocuments,
  getRawDocumentData,
  markDocumentsAsCompleted,
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
  loadingIds: string[]
  canEdit: boolean
  isBulkMarking: boolean
  isBulkDeleting: boolean
  onSelectionChange: (docs: DocumentMetadata[]) => void
  onBulkMarkCompleted: () => void
  onBulkDelete: () => void
}

type DataTablePaginationProps<TData> = {
  table: TableType<TData>
}

type DocumentTableMeta = {
  filteredDocuments: DocumentMetadata[]
  handleMarkCompleted: (doc: DocumentMetadata) => void
  setDocumentToDelete: (doc: DocumentMetadata) => void
  loadingIds: string[]
  canEdit: boolean
}

function DataTable({
  columns,
  data,
  filteredDocuments,
  setDocumentToDelete,
  handleMarkCompleted,
  loadingIds,
  canEdit,
  isBulkMarking,
  isBulkDeleting,
  onSelectionChange,
  onBulkMarkCompleted,
  onBulkDelete,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

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
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: canEdit,
    meta: {
      filteredDocuments,
      handleMarkCompleted,
      setDocumentToDelete,
      loadingIds,
      canEdit,
    } satisfies DocumentTableMeta,
  })

  // propagate selected rows back to parent
  useEffect(() => {
    const selected = table
      .getSelectedRowModel()
      .rows
      .map(r => r.original)
    onSelectionChange(selected)
  }, [rowSelection, table, onSelectionChange])

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
      {table.getSelectedRowModel().rows.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium">
            {table.getSelectedRowModel().rows.length}
            {' '}
            selected
          </span>
          {(() => {
            const selected = table.getSelectedRowModel().rows
            const hasIncomplete = selected.some(r => !r.original.completedAt)
            return (
              <Button size="sm" onClick={onBulkMarkCompleted} disabled={isBulkMarking}>
                {isBulkMarking && <Loader2Icon className="mr-1 size-4 animate-spin" />}
                {hasIncomplete ? 'Mark completed' : 'Mark not completed'}
              </Button>
            )
          })()}
          <Button
            size="sm"
            variant="destructive"
            onClick={onBulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting && <Loader2Icon className="mr-1 size-4 animate-spin" />}
            Delete
          </Button>
        </div>
      )}
      <div className="w-full overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
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
                    <TableRow key={row.id} className="border-t border-border transition-colors hover:bg-muted/30">
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
                      className="h-24 px-3 py-2.5 text-center text-[13px]"
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
    id: 'select',
    header: ({ table }) => {
      const meta = table.options.meta as DocumentTableMeta
      if (!meta.canEdit) {
        return null
      }
      return (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          aria-checked={table.getIsSomeRowsSelected() ? 'mixed' : undefined}
          onCheckedChange={checked => table.toggleAllRowsSelected(!!checked)}
        />
      )
    },
    cell: ({ row, table }) => {
      const meta = table.options.meta as DocumentTableMeta
      if (!meta.canEdit) {
        return null
      }
      return (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={checked => row.toggleSelected(!!checked)}
        />
      )
    },
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/document/${row.original.id}`}
        className="block text-foreground hover:text-accent hover:underline"
      >
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
      <div className="font-mono text-muted-foreground tabular-nums">
        {JSON.stringify(row.original.annotationsCount)}
      </div>
    ),
  },
  {
    accessorKey: 'completedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Completed" />
    ),
    cell: ({ row, table }) => {
      const completed = !!row.original.completedAt
      const meta = table.options.meta as DocumentTableMeta
      const isLoading = meta?.loadingIds?.includes(row.original.id) ?? false
      const toggle = () => meta?.handleMarkCompleted(row.original)
      return (
        <div className="flex items-center gap-2">
          {meta?.canEdit && (
            <>
              {isLoading
                ? <Loader2Icon className="size-4 animate-spin" />
                : (
                    <Checkbox
                      checked={completed}
                      onCheckedChange={toggle}
                      className="shrink-0 rounded-full"
                      disabled={isLoading}
                    />
                  )}
            </>
          )}
          <span suppressHydrationWarning className="text-muted-foreground">
            {row.original.completedAt
              ? row.original.completedAt.toLocaleString()
              : (
                  <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-foreground">
                    Not completed
                  </span>
                )}
          </span>
        </div>
      )
    },
    filterFn: (row, columnId, filterValue) => {
      if (filterValue === true) {
        return !row.original.completedAt
      }
      return true
    },
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Updated" />
    ),
    cell: ({ row }) => (
      <div suppressHydrationWarning>
        {row.original.updatedAt.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: 'actions',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" />
    ),
    cell: ({ row, table }) => {
      const meta = table.options.meta as DocumentTableMeta
      return (
        <div className="flex items-center gap-2">
          <Link href={`/document/${row.original.id}`}>
            <Button variant="outline" size="sm">
              <FilePenIcon className="size-4" />
              Open
            </Button>
          </Link>
          {meta.canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 p-0">
                  <MoreVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => meta.handleMarkCompleted(row.original)}
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
                  onClick={() => downloadRawDocumentData(row.original.id, row.original.title)}
                >
                  <DownloadIcon className="mr-2 size-4" />
                  Download Raw Data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => meta.setDocumentToDelete(row.original)}
                  className="font-medium text-destructive focus:text-destructive"
                >
                  <Trash2Icon className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )
    },
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
            className="-ml-3 h-8 text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
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
  canEdit,
}: {
  documents: DocumentMetadata[]
  canEdit?: boolean
}) {
  const [documentToDelete, setDocumentToDelete]
    = useState<DocumentMetadata | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<
    DocumentMetadata[]
  >([])
  const [loadingIds, setLoadingIds] = useState<string[]>([])
  const [isBulkMarking, setIsBulkMarking] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

  const handleBulkMarkCompleted = async () => {
    if (selectedDocuments.length === 0)
      return

    setIsBulkMarking(true)

    const hasIncomplete = selectedDocuments.some(d => !d.completedAt)
    const value = hasIncomplete ? new Date() : null

    await markDocumentsAsCompleted(
      selectedDocuments.map(d => d.id),
      value,
    )

    toast.success(
      hasIncomplete
        ? 'Selected documents marked as completed'
        : 'Selected documents marked as not completed',
    )

    // update timestamps locally so UI reflects the change without losing selection
    setSelectedDocuments(
      selectedDocuments.map(d => ({ ...d, completedAt: value })),
    )
    setIsBulkMarking(false)
  }

  const confirmBulkDelete = () => {
    if (selectedDocuments.length === 0)
      return
    setShowBulkDeleteDialog(true)
  }

  const performBulkDelete = async () => {
    setIsBulkDeleting(true)
    await deleteDocuments(selectedDocuments.map(d => d.id))
    setIsBulkDeleting(false)
    // clear selection since those documents are gone
    setSelectedDocuments([])
    setShowBulkDeleteDialog(false)
  }

  const handleMarkCompleted = async (document: DocumentMetadata) => {
    setLoadingIds(ids => [...ids, document.id])
    await markDocumentsAsCompleted(
      [document.id],
      document.completedAt ? null : new Date(),
    )
    setLoadingIds(ids => ids.filter(id => id !== document.id))

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
    await deleteDocuments([documentToDelete.id])
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
        loadingIds={loadingIds}
        canEdit={canEdit ?? true}
        isBulkMarking={isBulkMarking}
        isBulkDeleting={isBulkDeleting}
        onSelectionChange={setSelectedDocuments}
        onBulkMarkCompleted={handleBulkMarkCompleted}
        onBulkDelete={confirmBulkDelete}
      />
      <Dialog
        open={!!documentToDelete}
        onOpenChange={() => setDocumentToDelete(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
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
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={() => setShowBulkDeleteDialog(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <p>
              Are you sure you want to delete
              {' '}
              <strong>{selectedDocuments.length}</strong>
              {' '}
              documents?
            </p>
            <p>This action cannot be undone and will also:</p>
            <ul className="ml-4 list-inside list-disc">
              <li>Delete all annotations attached to these documents</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={performBulkDelete}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting
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
