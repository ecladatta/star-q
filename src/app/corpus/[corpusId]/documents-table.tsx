'use client'

import type { Document } from '@/db/schema'
import { deleteDocument, markDocumentAsCompleted } from '@/actions/corpusActions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, MoreHorizontal, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

export default function DocumentsTable({ documents }: { documents: (Document & { annotationsCount: number })[] }) {
  const [search, setSearch] = useState('')
  const [showOnlyNotCompleted, setShowOnlyNotCompleted] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase())
    const isNotCompleted = !doc.completedAt
    return matchesSearch && (!showOnlyNotCompleted || isNotCompleted)
  })

  const handleMarkCompleted = async (document: Document) => {
    await markDocumentAsCompleted(document.id, document.completedAt ? null : new Date())
    toast.success(document.completedAt ? 'Document marked as not completed' : 'Document marked as completed')
  }

  const confirmDelete = async () => {
    if (!documentToDelete) {
      return
    }
    setIsDeleting(true)
    await deleteDocument(documentToDelete.id)
    setDocumentToDelete(null)
    setIsDeleting(false)
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
        <div className="flex items-center gap-1">
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
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Annotations</TableHead>
            <TableHead>Date Completed</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDocuments.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>{doc.title}</TableCell>
              <TableCell>{doc.annotationsCount}</TableCell>
              <TableCell>{doc.completedAt ? doc.completedAt.toLocaleString() : 'N/A'}</TableCell>
              <TableCell>
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
                        onClick={() => setDocumentToDelete(doc)}
                        className="font-bold text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              <p>
                Are you sure you want to delete the document "
                <strong>{documentToDelete?.title}</strong>
                "?
              </p>
              <p>This action cannot be undone and will also:</p>
              <ul className="ml-4 list-inside list-disc">
                <li>Delete all annotations attached to this document</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
