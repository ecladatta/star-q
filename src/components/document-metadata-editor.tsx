'use client'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Document } from '@/db/schema'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AlertTriangleIcon, GripVertical, Trash2 } from 'lucide-react'
import { unstable_rethrow } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateDocumentMetadata } from '@/actions/document/documentActions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeSourceUrls, sourceUrlsEqual } from '@/lib/document-metadata'
import { cn } from '@/lib/utils'

type DocumentMetadataEditorProps = {
  document: Document
  open: boolean
  onOpenChange: (open: boolean) => void
}

type UrlRow = { id: number, url: string }

// The picker only accepts YYYY-MM-DD; a stored value it cannot show (a full
// ISO timestamp, free text) stays untouched unless the user picks a date.
function dateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
}

// Rows always end with one empty entry: the add-URL affordance (it renders
// without a trash button). Typing into it makes it a regular row and a fresh
// one appears below; clearing a row collapses back to a single add row.
function withTrailingAddRow(rows: UrlRow[], newRow: (url?: string) => UrlRow): UrlRow[] {
  const filled = rows.filter(row => row.url !== '')
  const addRow = rows.find(row => row.url === '')
  return addRow ? [...filled, addRow] : [...filled, newRow()]
}

function SortableUrlRow({
  row,
  onUrlChange,
  onRemove,
}: {
  row: UrlRow
  onUrlChange: (id: number, url: string) => void
  onRemove: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'relative flex items-center gap-1',
        isDragging && 'z-10 rounded-lg bg-background shadow-md',
      )}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
    >
      <Button
        ref={setActivatorNodeRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Reorder"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </Button>
      <Input
        value={row.url}
        onChange={e => onUrlChange(row.id, e.target.value)}
        placeholder="https://example.org/source"
        className="flex-1"
      />
      {row.url !== '' && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove URL"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(row.id)}
        >
          <Trash2 />
        </Button>
      )}
    </li>
  )
}

function UrlRows({
  rows,
  setRows,
  newRow,
}: {
  rows: UrlRow[]
  setRows: (update: (prev: UrlRow[]) => UrlRow[]) => void
  newRow: (url?: string) => UrlRow
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setUrl = (id: number, url: string) => {
    setRows(prev => withTrailingAddRow(prev.map(row => (row.id === id ? { ...row, url } : row)), newRow))
  }

  const removeRow = (id: number) => {
    setRows(prev => withTrailingAddRow(prev.filter(row => row.id !== id), newRow))
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      setRows(prev => withTrailingAddRow(arrayMove(
        prev,
        prev.findIndex(row => row.id === active.id),
        prev.findIndex(row => row.id === over.id),
      ), newRow))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={rows.map(row => row.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {rows.map(row => (
            <SortableUrlRow key={row.id} row={row} onUrlChange={setUrl} onRemove={removeRow} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

export function DocumentMetadataEditor({ document, open, onOpenChange }: DocumentMetadataEditorProps) {
  const [title, setTitle] = useState(document.title)
  const [versionDate, setVersionDate] = useState(document.versionDate ?? '')
  const [wikidataId, setWikidataId] = useState(document.wikidataId ?? '')
  const nextRowIdRef = useRef(0)
  const newRow = (url = '') => ({ id: nextRowIdRef.current++, url })
  const [sourceUrlRows, setSourceUrlRows] = useState<UrlRow[]>(
    () => [...(document.sourceUrls ?? []).map(url => newRow(url)), newRow()],
  )
  const [isPending, startTransition] = useTransition()
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // Compare the normalized forms the save would store, so whitespace-only
  // edits and the empty trailing URL row do not count as changes.
  const isDirty = title.trim() !== document.title.trim()
    || (versionDate.trim() || null) !== (document.versionDate ?? null)
    || (wikidataId.trim() || null) !== (document.wikidataId ?? null)
    || !sourceUrlsEqual(sourceUrlRows.map(row => row.url), document.sourceUrls)

  const requestClose = () => {
    if (isDirty)
      setConfirmingDiscard(true)
    else
      onOpenChange(false)
  }

  const save = () => {
    startTransition(async () => {
      try {
        await updateDocumentMetadata(document.id, {
          title,
          versionDate: versionDate.trim() || null,
          wikidataId: wikidataId.trim() || null,
          sourceUrls: normalizeSourceUrls(sourceUrlRows.map(row => row.url)),
        })
        toast.success('Metadata updated')
        onOpenChange(false)
      } catch (error) {
        unstable_rethrow(error)
        setConfirmingDiscard(false)
        toast.error(error instanceof Error ? error.message : 'Failed to update metadata')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && requestClose()}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit metadata</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor={`document-title-${document.id}`}>Title</Label>
            <Input
              id={`document-title-${document.id}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor={`document-version-date-${document.id}`}>Version date</Label>
            <Input
              id={`document-version-date-${document.id}`}
              type="date"
              value={dateInputValue(versionDate)}
              onChange={e => setVersionDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`document-wikidata-${document.id}`}>Wikidata ID</Label>
            <Input
              id={`document-wikidata-${document.id}`}
              value={wikidataId}
              onChange={e => setWikidataId(e.target.value)}
              placeholder="Q123"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor={`document-source-urls-${document.id}`}>Source URLs</Label>
            <div className="mt-1">
              <UrlRows rows={sourceUrlRows} setRows={setSourceUrlRows} newRow={newRow} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
        <AlertDialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <AlertTriangleIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                The metadata changes have not been saved. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Keep editing</AlertDialogCancel>
              <AlertDialogAction type="button" variant="destructive" onClick={() => onOpenChange(false)}>
                Discard
              </AlertDialogAction>
              <AlertDialogAction type="button" onClick={save} disabled={isPending}>
                Save changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
