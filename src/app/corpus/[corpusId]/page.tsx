import { getCorpus } from '@/actions/corpus/corpusActions'
import { getDocumentsMetadata } from '@/actions/document/documentActions'
import CorpusSettingsButton from '@/components/corpus-settings-button'
import React from 'react'
import DocumentsTable from './documents-table'

export default async function CorpusPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const corpusId = (await params).corpusId
  const documentsList = await getDocumentsMetadata(corpusId)
  const corpus = await getCorpus(corpusId)

  if (!corpus) {
    return <div>Corpus not found</div>
  }

  return (
    <div className="container mx-auto flex size-full min-h-screen max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{corpus.title}</h1>
          <p className="text-sm text-muted-foreground">
            Select a document to start annotating
          </p>
        </div>
        <CorpusSettingsButton corpus={corpus} />
      </div>
      <DocumentsTable documents={documentsList} />
    </div>
  )
}
