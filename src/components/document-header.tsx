'use client'
import type { Document } from '@/db/schema'
import type { DocumentData } from '@/types/types'
import { Check, Circle, CircleCheckBig, Copy, ListIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { markDocumentsAsCompleted } from '@/actions/document/documentActions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ShortcutsDialog } from './shortcuts-dialog'

type DocumentHeaderProps = {
  document: Document
  documentData: DocumentData
  readOnly?: boolean
  annotationsCount: number
  onOpenAnnotations: () => void
  copiedDocument: boolean
  onCopyText: () => void
  onCopyWholeDocument: () => void
}

export function DocumentHeader({
  document,
  documentData,
  readOnly = false,
  annotationsCount,
  onOpenAnnotations,
  copiedDocument,
  onCopyText,
  onCopyWholeDocument,
}: DocumentHeaderProps) {
  const [isCompleted, setIsCompleted] = useState(!!document.completedAt)
  const [isPending, startTransition] = useTransition()

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
      <div className="mx-auto flex h-11 w-full max-w-4xl items-center gap-2 px-5 lg:px-8">
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
                aria-label="Copy document"
              >
                {copiedDocument
                  ? (
                      <Check className="size-3.5" />
                    )
                  : (
                      <Copy className="size-3.5" />
                    )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onCopyText}>
                Copy Text Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyWholeDocument}>
                Copy Whole Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!readOnly && (
            <Button
              onClick={toggleCompletion}
              disabled={isPending}
              variant="ghost"
              size="icon"
              className="shrink-0 gap-2"
              title={isCompleted ? 'Completed' : 'Mark as Complete'}
            >
              {isCompleted ? <CircleCheckBig className="size-4" /> : <Circle className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
