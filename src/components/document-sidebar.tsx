'use client'
import type { DocumentMetadata } from '@/actions/corpus/corpusActions'
import type { Corpus, Document } from '@/db/schema'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type DocumentSidebarProps = {
  corpus: Corpus
  documents: DocumentMetadata[]
  currentDocument?: Document
}

export function DocumentSidebar({ corpus, documents, currentDocument }: DocumentSidebarProps) {
  const currentDocumentRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (currentDocumentRef.current) {
      currentDocumentRef.current.scrollIntoView({
        behavior: 'instant',
        block: 'center',
      })
    }
  }, [currentDocument?.id])

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[280px] bg-gray-100 pt-16 lg:block">
      <div className="flex h-full flex-col">
        <div className="mt-6 px-8">
          <Link href={`/corpus/${corpus.id}`} passHref>
            <Button variant="outline" className="w-full px-6 py-2">
              Back to Corpus
            </Button>
          </Link>
        </div>
        <h2 className="my-4 px-8 text-xl font-bold">
          {documents.length}
          {' '}
          document
          {documents.length === 1 ? '' : 's'}
        </h2>
        <ScrollArea>
          <ul className="px-8">
            {documents.map((doc, i) => (
              <li
                key={doc.id}
                ref={doc.id === currentDocument?.id ? currentDocumentRef : null}
                className={cn(
                  'mb-2',
                  doc.id === currentDocument?.id && 'font-semibold text-blue-500',
                )}
              >
                <Link
                  href={`/document/${doc.id}`}
                  className={cn(
                    'flex w-full flex-col gap-0 rounded p-2 text-left transition-colors hover:bg-gray-200',
                    doc.id === currentDocument?.id && 'border border-blue-200 bg-blue-50',
                  )}
                >
                  <span
                    className="max-w-[220px] truncate break-all"
                    title={doc.title}
                  >
                    {i + 1}
                    .
                    {' '}
                    {doc.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {doc.annotationsCount}
                    {' '}
                    annotation
                    {doc.annotationsCount === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>
    </aside>
  )
}
