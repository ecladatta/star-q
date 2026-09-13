'use client'
import type { CellBatchOriginRect } from '@/hooks/useCellBatch'
import { Check, Columns3Icon, Copy, Grid2x2Check, Rows3Icon } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type TableBatchControlsProps = {
  readOnly: boolean
  tableHasDataRows: boolean
  hoveredCell: { row: number, cell: number } | null
  columnButtonPosition: { top: number, left: number } | null
  rowButtonPosition: { top: number, left: number } | null
  tableActionRailPosition: { top: number, left: number } | null
  copied: boolean
  portalTarget: HTMLElement | null
  onSelectColumn?: ((col: number, additive: boolean, originRect?: CellBatchOriginRect | null) => void) | null
  onSelectRow?: ((row: number, additive: boolean, originRect?: CellBatchOriginRect | null) => void) | null
  onSelectAll?: ((additive: boolean, originRect?: CellBatchOriginRect | null) => void) | null
  onCopyTable: () => void
  onColumnButtonRef: (button: HTMLButtonElement | null) => void
  onRowButtonRef: (button: HTMLButtonElement | null) => void
  onRowButtonLeave: (event: React.MouseEvent<HTMLElement>) => void
}

function originRectFrom(element: Element): CellBatchOriginRect {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  }
}

export function TableBatchControls({
  readOnly,
  tableHasDataRows,
  hoveredCell,
  columnButtonPosition,
  rowButtonPosition,
  tableActionRailPosition,
  copied,
  portalTarget,
  onSelectColumn,
  onSelectRow,
  onSelectAll,
  onCopyTable,
  onColumnButtonRef,
  onRowButtonRef,
  onRowButtonLeave,
}: TableBatchControlsProps) {
  return (
    <>
      {!readOnly && onSelectColumn && tableHasDataRows && hoveredCell && columnButtonPosition && portalTarget && createPortal(
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={onColumnButtonRef}
              type="button"
              tabIndex={-1}
              data-batch-select-trigger="column"
              className="absolute z-30 -translate-x-1/2 -translate-y-full rounded-md border bg-background/95 p-1 text-muted-foreground opacity-100 shadow-sm transition-opacity before:absolute before:-inset-3 before:content-[''] after:absolute after:inset-x-0 after:-bottom-4 after:h-4 after:content-[''] hover:text-foreground focus-visible:opacity-100"
              style={{ top: columnButtonPosition.top, left: columnButtonPosition.left }}
              onMouseDown={event => event.stopPropagation()}
              onPointerDown={event => event.stopPropagation()}
              onMouseUp={event => event.stopPropagation()}
              onClick={(event) => {
                onSelectColumn(hoveredCell.cell, event.ctrlKey || event.metaKey, originRectFrom(event.currentTarget))
              }}
              aria-label={`Annotate column ${hoveredCell.cell + 1}`}
            >
              <Columns3Icon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Annotate this column. Ctrl/Cmd-click to add another column.
          </TooltipContent>
        </Tooltip>,
        portalTarget,
      )}
      {!readOnly && onSelectRow && tableHasDataRows && hoveredCell && rowButtonPosition && portalTarget && createPortal(
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={onRowButtonRef}
              type="button"
              tabIndex={-1}
              data-batch-select-trigger="row"
              className="absolute z-30 rounded-md border bg-background/95 p-1 text-muted-foreground opacity-100 shadow-sm transition-opacity before:absolute before:-inset-3 before:content-[''] after:absolute after:inset-y-0 after:-right-4 after:w-4 after:content-[''] hover:text-foreground focus-visible:opacity-100"
              style={{ top: rowButtonPosition.top, left: rowButtonPosition.left }}
              onMouseDown={event => event.stopPropagation()}
              onPointerDown={event => event.stopPropagation()}
              onMouseUp={event => event.stopPropagation()}
              onMouseLeave={onRowButtonLeave}
              onClick={(event) => {
                onSelectRow(hoveredCell.row, event.ctrlKey || event.metaKey, originRectFrom(event.currentTarget))
              }}
              aria-label={`Annotate row ${hoveredCell.row + 1}`}
            >
              <Rows3Icon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Annotate this row. Ctrl/Cmd-click to add another row.
          </TooltipContent>
        </Tooltip>,
        portalTarget,
      )}
      {tableActionRailPosition && (
        <div
          className="pointer-events-none absolute z-30 flex flex-col gap-1 rounded-md border bg-background/95 p-1 opacity-0 shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
          style={{ top: tableActionRailPosition.top, left: tableActionRailPosition.left }}
        >
          {!readOnly && onSelectAll && tableHasDataRows && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="size-7 p-1"
                  onClick={event => onSelectAll(event.ctrlKey || event.metaKey, originRectFrom(event.currentTarget))}
                  tabIndex={-1}
                  data-batch-select-trigger="all"
                  aria-label="Select all table cells"
                >
                  <Grid2x2Check className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                Select all cells
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="size-7 p-1"
                onClick={onCopyTable}
                tabIndex={-1}
              >
                {copied
                  ? (
                      <>
                        <Check className="size-4" />
                      </>
                    )
                  : (
                      <>
                        <Copy className="size-4" />
                      </>
                    )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Copy table as Markdown
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  )
}
