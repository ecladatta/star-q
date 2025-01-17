import { getDocuments } from '@/actions/corpusActions'

import React from 'react'
import DocumentsTable from './documents-table'

export default async function CorpusPage({ params }: { params: Promise<{ corpusId: string }> }) {
  const corpusId = (await params).corpusId
  const documents = await getDocuments(corpusId)

  return (
    <div className="container mx-auto flex size-full min-h-screen max-w-6xl flex-col px-4 py-12 sm:px-6 lg:px-8">
      <div className="">
        <h2 className="mb-4 text-center text-2xl font-bold">Select a document to start annotating</h2>
        <DocumentsTable documents={documents} />
        {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc, i) => (
            <Link key={doc.id} href={`/document/${doc.id}`}>
              <Card className="flex h-full flex-col justify-center">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span>
                      {i + 1}
                      .
                      {' '}
                      {doc.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {doc.annotationsCount}
                    {' '}
                    annotation
                    {doc.annotationsCount === 1 ? '' : 's'}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div> */}
      </div>
    </div>
  )
}
