import { getDocumentsMetadata } from '@/actions/corpusActions'
import React from 'react'
import DocumentsTable from './documents-table'

export default async function CorpusPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const corpusId = (await params).corpusId
  const documentsList = await getDocumentsMetadata(corpusId)

  return (
    <div className="container mx-auto flex size-full min-h-screen max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-8">
      <div className="">
        <h2 className="mb-4 text-center text-2xl font-bold">Select a document to start annotating</h2>
        <DocumentsTable documents={documentsList} />
      </div>
    </div>
  )
}
