'use client'

import type { Document } from '@/db/schema'
import { deleteDocument, markDocumentAsCompleted } from '@/actions/corpusActions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { MoreHorizontal } from 'lucide-react' // You might need to install lucide-react
import Link from 'next/link'
import { useState } from 'react'

export default function DocumentsTable({ documents }: { documents: (Document & { annotationsCount: number })[] }) {
  const [search, setSearch] = useState('')
  const [showOnlyNotCompleted, setShowOnlyNotCompleted] = useState(false)

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase())
    const isNotCompleted = !doc.completedAt
    return matchesSearch && (!showOnlyNotCompleted || isNotCompleted)
  })

  const handleMarkCompleted = async (document: Document) => {
    await markDocumentAsCompleted(document.id, document.completedAt ? null : new Date())
  }

  const handleDelete = async (docId: string) => {
    await deleteDocument(docId)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-1/2"
        />
        <Checkbox
          id="show-only-not-completed"
          checked={showOnlyNotCompleted}
          onCheckedChange={checked => setShowOnlyNotCompleted(checked === true)}
        />
        <label
          htmlFor="show-only-not-completed"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show only not completed
        </label>
      </div>
      <table className="min-w-full border">
        <caption className="py-2 text-left">
          Total documents:
          {documents.length}
        </caption>
        <thead>
          <tr>
            <th className="border px-2 py-1">Title</th>
            <th className="border px-2 py-1">Annotations</th>
            <th className="border px-2 py-1">Date Completed</th>
            <th className="border px-2 py-1">Annotators</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map(doc => (
            <tr key={doc.id}>
              <td className="border px-2 py-1">{doc.title}</td>
              <td className="border px-2 py-1">{doc.annotationsCount}</td>
              <td className="border px-2 py-1">{doc.completedAt ? doc.completedAt.toLocaleString() : 'N/A'}</td>
              <td className="border px-2 py-1">N/A</td>
              <td className="border px-2 py-1">
                <div className="flex items-center gap-2">
                  <Link href={`/document/${doc.id}`}>
                    <Button>Open</Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 p-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleMarkCompleted(doc)}>
                        {doc.completedAt
                          ? 'Mark as not completed'
                          : 'Mark as completed'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(doc.id)}
                        className="font-bold text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
