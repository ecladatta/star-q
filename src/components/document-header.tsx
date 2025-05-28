import type { Corpus } from '@/db/schema'
import type { DocumentData } from '@/types/types'
import Link from 'next/link'
import React from 'react'

type DocumentHeaderProps = {
  corpus: Corpus
  documentData: DocumentData
}

export function DocumentHeader({ corpus, documentData }: DocumentHeaderProps) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">
        Corpus:
        {' '}
        <Link href={`/corpus/${corpus.id}`} className="underline">
          {corpus.title}
        </Link>
      </h1>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">
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
          <p className="text-sm text-muted-foreground">
            <strong>Wikidata: </strong>
            {' '}
            <Link
              href={`https://www.wikidata.org/wiki/${documentData._source.identificationMetadata.wikidata}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-blue-500 underline"
            >
              {documentData._source.identificationMetadata.wikidata}
            </Link>
          </p>
        )}
        {documentData._source.identificationMetadata.url && (
          <p className="text-sm text-muted-foreground">
            <strong>URL: </strong>
            {Array.isArray(documentData._source.identificationMetadata.url)
              ? (
                  documentData._source.identificationMetadata.url.map((url, i) => (
                    <React.Fragment key={url}>
                      {i > 0 && ', '}
                      <Link
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-500 underline"
                      >
                        {url}
                      </Link>
                    </React.Fragment>
                  ))
                )
              : (
                  <Link
                    href={documentData._source.identificationMetadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-500 underline"
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
