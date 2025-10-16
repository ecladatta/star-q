'use client'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Document } from '@/db/schema'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type DocumentSidebarProps = {
  documents: DocumentMetadata[]
  currentDocument?: Document
}

export function DocumentSidebar({ documents, currentDocument }: DocumentSidebarProps) {
  const currentDocumentRef = useRef<HTMLLIElement>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  useEffect(() => {
    if (currentDocumentRef.current) {
      currentDocumentRef.current.scrollIntoView({
        behavior: 'instant',
        block: 'center',
      })
    }
  }, [currentDocument?.id])

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[280px] border-r bg-background pt-12 lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b bg-muted/30 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Documents
            <Badge variant="secondary" className="ml-auto">
              {documents.length}
            </Badge>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="size-full">
            <ul className="space-y-2 p-4">
              {filteredDocuments.map((doc) => {
                const originalIndex = documents.findIndex(d => d.id === doc.id)
                const isSelected = doc.id === currentDocument?.id
                return (
                  <li
                    key={doc.id}
                    ref={doc.id === currentDocument?.id ? currentDocumentRef : null}
                  >
                    <Link
                      href={`/document/${doc.id}`}
                      className={cn(
                        'block w-full rounded-lg border p-3 text-left transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20'
                          : 'border-border bg-card hover:border-blue-300 hover:shadow-sm',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="flex-1 truncate whitespace-normal font-medium"
                          title={doc.title}
                        >
                          {originalIndex + 1}
                          .
                          {' '}
                          {doc.title}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {doc.annotationsCount}
                        {' '}
                        annotation
                        {doc.annotationsCount === 1 ? '' : 's'}
                      </div>
                    </Link>
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
