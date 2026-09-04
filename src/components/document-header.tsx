'use client'
import type { Document } from '@/db/schema'
import type { DocumentData } from '@/types/types'
import { Circle, CircleCheck, Download, FileText, ListIcon, MoreHorizontal, Type } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { markDocumentsAsCompleted } from '@/actions/document/documentActions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setFullWidth, useFullWidth } from '@/lib/display'
import { downloadRawDocumentData } from '@/lib/download-document'
import { ShortcutsDialog } from './shortcuts-dialog'

type DocumentHeaderProps = {
  document: Document
  documentData: DocumentData
  readOnly?: boolean
  annotationsCount: number
  onOpenAnnotations: () => void
  onCopyText: () => void
  onCopyWholeDocument: () => void
}

export function DocumentHeader({
  document,
  documentData,
  readOnly = false,
  annotationsCount,
  onOpenAnnotations,
  onCopyText,
  onCopyWholeDocument,
}: DocumentHeaderProps) {
  const [isCompleted, setIsCompleted] = useState(!!document.completedAt)
  const [isPending, startTransition] = useTransition()
  const fullWidth = useFullWidth()

  const toggleCompletion = () => {
    startTransition(async () => {
      try {
        const newValue = isCompleted ? null : new Date()
        await markDocumentsAsCompleted([document.id], newValue)
        setIsCompleted(!isCompleted)
        toast.success(isCompleted ? 'Document marked as incomplete' : 'Document marked as complete')
      } catch (error) {
        toast.error('Failed to update document status')
        console.error(error)
      }
    })
  }

  const title = documentData._source.identificationMetadata.title

  return (
    <div className="sticky top-0 z-30 border-b bg-background">
      <div className="document-container mx-auto flex h-11 w-full max-w-4xl items-center gap-2 px-5 lg:px-8">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {annotationsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 md:hidden"
              onClick={onOpenAnnotations}
            >
              <ListIcon className="size-3.5" />
              <span className="text-xs">{annotationsCount}</span>
              <span className="sr-only">Open annotations panel</span>
            </Button>
          )}
          <ShortcutsDialog />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0"
                aria-label="Document actions"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={fullWidth}
                onCheckedChange={checked => setFullWidth(checked)}
              >
                Full width
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCopyText}>
                <Type className="size-4" />
                Copy Text Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyWholeDocument}>
                <FileText className="size-4" />
                Copy Whole Document
              </DropdownMenuItem>
              {!readOnly && (
                <>
                  <DropdownMenuItem onClick={() => downloadRawDocumentData(document.id, document.title)}>
                    <Download className="size-4" />
                    Download Raw Data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleCompletion} disabled={isPending}>
                    {isCompleted ? <Circle className="size-4" /> : <CircleCheck className="size-4" />}
                    {isCompleted ? 'Mark as Not Completed' : 'Mark as Completed'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
