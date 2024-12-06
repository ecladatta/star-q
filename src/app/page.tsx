'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileDown, FileUp, FolderOpen, PlusCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

export default function AnnotationTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // @TODO: Handle file import
      // eslint-disable-next-line no-console
      console.log('File selected:', file)
      router.push('/document')
    }
  }

  const handleExportClick = () => {
    setIsExporting(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 5
      })
    }, 100)
  }

  return (
    <main className="ml-0 min-w-0 flex-1">
      <div className="container mx-auto p-12">
        <Link href="/"><h1 className="mb-6 text-3xl font-bold">ECLADATTA Annotation Tool</h1></Link>

        {/* Corpus Management */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Corpus Management</h2>
          <div className="mb-4 flex space-x-4">
            <Input placeholder="New corpus name" className="max-w-xs" />
            <Link href="/document">
              <Button>
                <PlusCircle className="mr-2 size-4" />
                {' '}
                Create Corpus
              </Button>
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Corpus Name</TableHead>
                <TableHead>Document Count</TableHead>
                <TableHead>Annotation Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Sample Corpus 1</TableCell>
                <TableCell>15</TableCell>
                <TableCell>0</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleImportClick}>
                      <FileUp className="mr-2 size-4" />
                      {' '}
                      Import
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <Link href="/document">
                      <Button variant="outline" size="sm">
                        <FolderOpen className="mr-2 size-4" />
                        {' '}
                        Open
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={handleExportClick}>
                      <FileDown className="mr-2 size-4" />
                      {' '}
                      Export
                    </Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 size-4" />
                      {' '}
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={isExporting} onOpenChange={setIsExporting}>
        <DialogContent className="m-0 size-full max-w-full p-0 sm:h-auto sm:max-w-[800px] sm:rounded-lg sm:p-6 sm:shadow-lg">
          <DialogHeader>
            <DialogTitle></DialogTitle>
            <DialogDescription>
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Exporting documents...</h2>
            <div className="flex items-center">
              <Progress value={progress} className="flex-1" />
              <span className="ml-2 w-10 text-right">
                {progress.toFixed()}
                %
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExporting(false)}>Cancel</Button>
            <Button type="submit" disabled={progress < 100}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
