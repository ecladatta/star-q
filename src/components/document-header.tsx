'use client'
import type { Corpus, Document } from '@/db/schema'
import type { DocumentData } from '@/types/types'
import { Check, Circle } from 'lucide-react'
import Link from 'next/link'
import { Fragment, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { markDocumentsAsCompleted } from '@/actions/document/documentActions'
import { Button } from '@/components/ui/button'

type DocumentHeaderProps = {
  corpus: Corpus
  document: Document
  documentData: DocumentData
}

export function DocumentHeader({ corpus, document, documentData }: DocumentHeaderProps) {
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

  return (
    <>
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 text-xl font-bold wrap-break-word sm:text-3xl">
          Corpus:
          {' '}
          <Link href={`/corpus/${corpus.id}`} className="underline">
            {corpus.title}
          </Link>
        </h1>
        <Button
          onClick={toggleCompletion}
          disabled={isPending}
          variant={isCompleted ? 'default' : 'outline'}
          size="sm"
          className="w-full shrink-0 gap-2 self-start sm:w-auto sm:self-auto"
        >
          {isCompleted ? <Check className="size-4" /> : <Circle className="size-4" />}
          {isCompleted ? 'Completed' : 'Mark as Complete'}
        </Button>
      </div>
      <div className="mb-4 min-w-0">
        <h2 className="text-2xl font-bold wrap-break-word">
          {documentData._source.identificationMetadata.title}
        </h2>
        {documentData._source.identificationMetadata.versionDate && (
          <p className="text-sm text-muted-foreground">
            <strong>Version Date:</strong>
            {' '}
            {documentData._source.identificationMetadata.versionDate}
          </p>
        )}
        {documentData._source.identificationMetadata.wikidata && (
          <p className="text-sm wrap-break-word text-muted-foreground">
            <strong>Wikidata: </strong>
            {' '}
            <Link
              href={`https://www.wikidata.org/wiki/${documentData._source.identificationMetadata.wikidata}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 break-all text-blue-500 underline"
            >
              {documentData._source.identificationMetadata.wikidata}
            </Link>
          </p>
        )}
        {documentData._source.identificationMetadata.url && (
          <p className="text-sm wrap-break-word text-muted-foreground">
            <strong>URL: </strong>
            {Array.isArray(documentData._source.identificationMetadata.url)
              ? (
                  documentData._source.identificationMetadata.url.map((url, i) => (
                    <Fragment key={url}>
                      {i > 0 && ', '}
                      <Link
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 break-all text-blue-500 underline"
                      >
                        {url}
                      </Link>
                    </Fragment>
                  ))
                )
              : (
                  <Link
                    href={documentData._source.identificationMetadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 break-all text-blue-500 underline"
                  >
                    {documentData._source.identificationMetadata.url}
                  </Link>
                )}
          </p>
        )}
      </div>
    </>
  )
}
