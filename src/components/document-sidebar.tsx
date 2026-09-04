'use client'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Document } from '@/db/schema'
import { CheckCircle, Loader2, Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type DocumentSidebarProps = {
  documents: DocumentMetadata[]
  currentDocument?: Document
}

export function DocumentSidebar({ documents, currentDocument }: DocumentSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentDocumentRef = useRef<HTMLLIElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [optimisticDocId, setOptimisticDocId] = useState<string | null>(null)

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleDocumentClick = (documentId: string) => {
    setOptimisticDocId(documentId)

    const params = new URLSearchParams(searchParams.toString())
    const url = `/document/${documentId}${params.toString() ? `?${params.toString()}` : ''}`

    startTransition(() => {
      router.push(url)
    })
  }

  useEffect(() => {
    if (currentDocument?.id && optimisticDocId === currentDocument.id) {
      const timer = setTimeout(setOptimisticDocId, 0, null)
      return () => clearTimeout(timer)
    }
  }, [currentDocument?.id, optimisticDocId])

  useEffect(() => {
    if (currentDocumentRef.current) {
      currentDocumentRef.current.scrollIntoView({
        behavior: 'instant',
        block: 'center',
      })
    }
  }, [currentDocument?.id])

  return (
    <aside className="hidden w-[280px] shrink-0 overflow-hidden border-r bg-background lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start">
      <div className="flex h-full min-w-0 flex-col">
        <div className="shrink-0 border-b px-3 py-1.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ScrollArea className="size-full">
            <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">
              Documents
            </p>
            <ul className="min-w-0 space-y-2 p-4 pt-1">
              {filteredDocuments.map((doc) => {
                const originalIndex = documents.findIndex(d => d.id === doc.id)
                const isSelected = optimisticDocId
                  ? doc.id === optimisticDocId
                  : doc.id === currentDocument?.id
                const isLoading = isPending && doc.id === optimisticDocId

                return (
                  <li
                    key={doc.id}
                    className="min-w-0"
                    ref={doc.id === currentDocument?.id ? currentDocumentRef : null}
                  >
                    <button
                      type="button"
                      onClick={() => handleDocumentClick(doc.id)}
                      disabled={isLoading}
                      className={cn(
                        'block w-full min-w-0 overflow-hidden rounded-md border px-3 py-2 text-left transition-colors',
                        isSelected
                          ? 'border-accent bg-accent/10 ring-1 ring-accent/20'
                          : 'border-border bg-card hover:border-accent/40',
                        isLoading && 'opacity-70',
                      )}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <span
                          className="min-w-0 flex-1 font-medium wrap-anywhere"
                          title={doc.title}
                        >
                          {originalIndex + 1}
                          .
                          {' '}
                          {doc.title}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {isLoading && (
                            <Loader2 className="size-4 animate-spin text-accent" />
                          )}
                          {doc.completedAt && (
                            <CheckCircle className="size-4 text-success" />
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {doc.annotationsCount}
                        {' '}
                        annotation
                        {doc.annotationsCount === 1 ? '' : 's'}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        </div>
      </div>
    </aside>
  )
}
