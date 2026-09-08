'use client'
import type { CellBatchOffset, CellBatchPreview } from '@/lib/cell-batch'
import { AlertTriangleIcon, CheckIcon, CopyIcon, LayersIcon, Loader2Icon, TextCursorInputIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ColumnBatchPanelProps = {
  preview: CellBatchPreview | null
  cellsCount: number
  capturedOffset: CellBatchOffset | null
  objectOffset: CellBatchOffset | null
  onObjectOffsetChange: (offset: CellBatchOffset | null) => void
  offsetExample: string | null
  hasSubject: boolean
  hasPredicate: boolean
  creating: boolean
  onExit: () => void
  onCreate: () => void
}

export function ColumnBatchPanel({
  preview,
  cellsCount,
  capturedOffset,
  objectOffset,
  onObjectOffsetChange,
  offsetExample,
  hasSubject,
  hasPredicate,
  creating,
  onExit,
  onCreate,
}: ColumnBatchPanelProps) {
  const ready = hasSubject && hasPredicate && (preview?.createCount ?? 0) > 0
  const visibleRows = preview?.rows.slice(0, 8) ?? []
  const hiddenRowCount = (preview?.rows.length ?? 0) - visibleRows.length

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <LayersIcon className="size-4 shrink-0 text-accent" />
          <span>
            Batch annotation ·
            {' '}
            {cellsCount}
            {' '}
            cell
            {cellsCount === 1 ? '' : 's'}
            {' '}
            selected
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit} disabled={creating}>
          <XIcon />
          Exit
        </Button>
      </div>

      {(!hasSubject || !hasPredicate) && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/40 px-2 py-1.5 text-xs text-muted-foreground">
          <TextCursorInputIcon className="size-3.5 shrink-0" />
          <span>
            {hasSubject
              ? 'Assign a predicate below — select text anywhere, or use the search field.'
              : hasPredicate
                ? 'Assign a subject below — select text anywhere, or use the search field.'
                : 'Assign a subject and a predicate below — select text anywhere, or use the search fields.'}
          </span>
        </div>
      )}

      <div className="mb-2 flex rounded-md border p-0.5">
        <button
          type="button"
          className={cn(
            'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
            objectOffset === null ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onObjectOffsetChange(null)}
          disabled={creating}
        >
          Entire cell
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
            objectOffset !== null ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
            !capturedOffset && 'cursor-not-allowed opacity-50 hover:text-muted-foreground',
          )}
          onClick={() => capturedOffset && onObjectOffsetChange(capturedOffset)}
          disabled={creating || !capturedOffset}
          title={capturedOffset ? 'Use the text selection captured from the first cell' : 'Select a part of a cell, then choose “Annotate column” in the popover to capture it'}
        >
          Same selection in each row
          {offsetExample && objectOffset !== null && (
            <span className="ml-1 font-normal opacity-70">
              (
              {offsetExample}
              )
            </span>
          )}
        </button>
      </div>

      {preview && preview.rows.length > 0 && (
        <div className="mb-2 max-h-40 overflow-y-auto rounded-md border bg-background">
          {visibleRows.map(row => (
            <div
              key={`${row.cell.elementIndex}:${row.cell.row}:${row.cell.col}`}
              className="flex items-center gap-1.5 border-b px-2 py-1.5 text-xs last:border-b-0"
            >
              {row.status === 'create' && (
                <>
                  <CheckIcon className="size-3.5 shrink-0 text-success" />
                  <span className="min-w-0 truncate">
                    {row.object?.annotationValue}
                  </span>
                </>
              )}
              {row.status === 'duplicate' && (
                <>
                  <CopyIcon className="size-3.5 shrink-0 text-amber-600" />
                  <span className="min-w-0 truncate">
                    {row.object?.annotationValue}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] font-medium text-amber-600">
                    already exists
                  </span>
                </>
              )}
              {row.status === 'empty' && (
                <>
                  <AlertTriangleIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="min-w-0 truncate text-muted-foreground/60">
                    Row
                    {' '}
                    {row.cell.row + 1}
                    {' '}
                    · empty cell
                  </span>
                </>
              )}
            </div>
          ))}
          {hiddenRowCount > 0 && (
            <div className="px-2 py-1.5 text-center text-xs text-muted-foreground">
              +
              {hiddenRowCount}
              {' '}
              more row
              {hiddenRowCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}

      {preview && preview.rows.length === 0 && (
        <div className="mb-2 rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
          No cells selected.
        </div>
      )}

      <Button
        className="w-full bg-success text-success-foreground hover:bg-success/90"
        disabled={!ready || creating}
        onClick={onCreate}
      >
        {creating
          ? (
              <Loader2Icon className="animate-spin" />
            )
          : (
              <CheckIcon />
            )}
        Create
        {' '}
        {preview?.createCount ?? 0}
        {' '}
        annotation
        {(preview?.createCount ?? 0) === 1 ? '' : 's'}
      </Button>
      {preview && (preview.duplicateCount > 0 || preview.emptyCount > 0) && (
        <div className="mt-1.5 text-center text-xs text-muted-foreground">
          {[
            preview.emptyCount > 0 && `${preview.emptyCount} empty cell${preview.emptyCount > 1 ? 's' : ''} skipped`,
            preview.duplicateCount > 0 && `${preview.duplicateCount} duplicate${preview.duplicateCount > 1 ? 's' : ''} skipped`,
          ].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  )
}
