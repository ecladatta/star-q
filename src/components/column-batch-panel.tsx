'use client'
import type { CellBatchPreview, CellExtraction } from '@/lib/cell-batch'
import type { EntityType } from '@/types/types'
import { CheckIcon, CopyIcon, LayersIcon, Loader2Icon, TextCursorInputIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CONSTANT_ROLES } from '@/lib/cell-batch'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<EntityType, string> = {
  subject: 'Subject',
  predicate: 'Predicate',
  object: 'Object',
}

const ROLE_SOFT: Record<EntityType, string> = {
  subject: 'bg-subject-soft text-subject-fg',
  predicate: 'bg-predicate-soft text-predicate-fg',
  object: 'bg-object-soft text-object-fg',
}

type ColumnBatchPanelProps = {
  preview: CellBatchPreview | null
  cellsCount: number
  cellRole: EntityType
  onCellRoleChange: (role: EntityType) => void
  extraction: CellExtraction | null
  onExtractionChange: (extraction: CellExtraction | null) => void
  capturedText: string | null
  hasFixed: Record<EntityType, boolean>
  creating: boolean
  onCreate: () => void
}

export function ColumnBatchPanel({
  preview,
  cellsCount,
  cellRole,
  onCellRoleChange,
  extraction,
  onExtractionChange,
  capturedText,
  hasFixed,
  creating,
  onCreate,
}: ColumnBatchPanelProps) {
  const [patternDraft, setPatternDraft] = useState<string>(
    extraction?.type === 'pattern' ? extraction.text : (capturedText ?? ''),
  )
  const [patternTab, setPatternTab] = useState<boolean>(extraction !== null)
  const patternMode = patternTab
  const constantRoles = CONSTANT_ROLES[cellRole]
  const fixedReady = constantRoles.every(role => hasFixed[role])
  const ready = fixedReady && (preview?.createCount ?? 0) > 0

  const missingRoles = constantRoles.filter(role => !hasFixed[role])
  const missingLabel = missingRoles.map(role => ROLE_LABEL[role].toLowerCase()).join(' and ')

  const visibleRows = (preview?.rows.filter(row => row.status !== 'empty') ?? []).slice(0, 5)
  const hiddenRowCount = (preview?.rows.filter(row => row.status !== 'empty').length ?? 0) - visibleRows.length

  const setPatternMode = (mode: boolean) => {
    if (creating) {
      return
    }
    setPatternTab(mode)
    if (!mode) {
      onExtractionChange(null)
    }
  }

  const applyPatternDraft = (draft: string) => {
    setPatternDraft(draft)
    if (draft.trim()) {
      onExtractionChange({ type: 'pattern', text: draft })
    } else {
      onExtractionChange(null)
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex min-w-0 items-center gap-1.5 text-sm font-medium">
        <LayersIcon className="size-4 shrink-0 text-accent" />
        <span>
          Batch annotation ·
          {' '}
          {cellsCount}
          {' '}
          cell
          {cellsCount === 1 ? '' : 's'}
        </span>
      </div>

      {missingRoles.length > 0 && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/40 px-2 py-1.5 text-xs text-muted-foreground">
          <TextCursorInputIcon className="size-3.5 shrink-0" />
          <span>
            Assign a shared
            {' '}
            {missingLabel}
            {' '}
            in the search fields above — it stays the same for every created annotation.
          </span>
        </div>
      )}

      <div className="mb-1.5 text-xs text-muted-foreground">
        Selected cells fill the
        {' '}
        <span className={cn('font-medium', ROLE_SOFT[cellRole])}>
          {ROLE_LABEL[cellRole]}
        </span>
        {' '}
        slot
      </div>
      <div className="mb-2 flex rounded-md border p-0.5">
        {(['subject', 'predicate', 'object'] as EntityType[]).map(type => (
          <button
            key={type}
            type="button"
            className={cn(
              'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
              cellRole === type ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onCellRoleChange(type)}
            disabled={creating}
          >
            {ROLE_LABEL[type]}
          </button>
        ))}
      </div>

      <div className="mb-1.5 text-xs text-muted-foreground">Per created annotation:</div>
      <div className="flex rounded-md border p-0.5">
        <button
          type="button"
          className={cn(
            'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
            !patternMode ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setPatternMode(false)}
          disabled={creating}
        >
          Entire cell
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 rounded-sm px-2 py-1 text-xs transition-colors',
            patternMode ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setPatternMode(true)}
          disabled={creating}
        >
          Same text in each row
        </button>
      </div>
      {patternMode && (
        <div className="mt-1.5">
          <input
            value={patternDraft}
            onChange={event => applyPatternDraft(event.target.value)}
            placeholder="Text to extract from each row…"
            className="w-full rounded-md border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
            disabled={creating}
          />
          {!patternDraft.trim() && (
            <div className="mt-1 text-[10px] text-muted-foreground/70">
              Leave empty to use entire cells. Type the exact text each row should contribute.
            </div>
          )}
        </div>
      )}

      {visibleRows.length > 0 && (
        <div className="mt-2 max-h-28 overflow-y-auto rounded-md border bg-background">
          {visibleRows.map(row => (
            <div
              key={`${row.cell.elementIndex}:${row.cell.row}:${row.cell.col}`}
              className="flex items-center gap-1.5 border-b px-2 py-1.5 text-xs last:border-b-0"
            >
              {row.status === 'create'
                ? <CheckIcon className="size-3.5 shrink-0 text-success" />
                : <CopyIcon className="size-3.5 shrink-0 text-amber-600" />}
              <span className="min-w-0 truncate">
                {row.component?.annotationValue}
              </span>
              {row.status === 'duplicate' && (
                <span className="ml-auto shrink-0 text-[10px] font-medium text-amber-600">
                  already exists
                </span>
              )}
            </div>
          ))}
          {hiddenRowCount > 0 && (
            <div className="px-2 py-1.5 text-center text-xs text-muted-foreground">
              +
              {hiddenRowCount}
              {' '}
              more
            </div>
          )}
        </div>
      )}

      <Button
        className="mt-2 w-full bg-success text-success-foreground hover:bg-success/90"
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
