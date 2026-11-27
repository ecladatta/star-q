'use client'

import type { ImportDocumentsResult } from '@/actions/imports/importActions'
import type { CorpusImportFormat } from '@/lib/imports/import-format'
import type { ImportItem, ImportItemOutcome, SourceId } from '@/lib/imports/import-wizard-model'
import {
  ArchiveIcon,
  CheckIcon,
  ChevronLeftIcon,
  CircleDashedIcon,
  CircleXIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileJsonIcon,
  FileUpIcon,
  GlobeIcon,
  Loader2Icon,
  RotateCcwIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { importDocuments, importDocumentsFromUrl } from '@/actions/imports/importActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MAX_IMPORT_FILE_SIZE_BYTES } from '@/lib/config'
import {
  CORPUS_IMPORT_FORMAT_IDS,
  CORPUS_IMPORT_FORMATS,
  importFormatAccept,
  isCorpusImportFormat,
} from '@/lib/imports/import-format'
import { formatForFileName, splitUrlList } from '@/lib/imports/import-wizard-model'
import { cn } from '@/lib/utils'

type WizardStep = 'source' | 'configure' | 'results'

type StagedFile = {
  id: string
  file: File
  format: CorpusImportFormat | null
}

type SingleFileSourceId = Exclude<SourceId, 'web-pages' | 'files'>

type SourceDefinition = {
  id: SourceId
  icon: typeof GlobeIcon
  title: string
  description: string
}

type DropZoneProps = {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
}

const SOURCES: SourceDefinition[] = [
  { id: 'web-pages', icon: GlobeIcon, title: 'Web pages', description: 'Fetch pages by URL, one per line' },
  { id: 'files', icon: FileUpIcon, title: 'Files', description: 'Text, Markdown, HTML, Wikitext, CSV, TSV or a documents ZIP' },
  { id: 'corpuswalker', icon: FileJsonIcon, title: 'CorpusWalker', description: 'JSONL export from a CorpusWalker crawl (.jsonl, .json)' },
  { id: 'labelstudio', icon: ClipboardListIcon, title: 'Label Studio', description: 'Tasks exported from Label Studio (.json)' },
  { id: 'irit-zip', icon: ArchiveIcon, title: 'IRIT archive', description: 'IRIT corpus archive (.zip)' },
  { id: 'full-corpus-export', icon: DatabaseIcon, title: 'STAR-Q export', description: 'Full corpus export from another STAR-Q instance (.json)' },
]

const SOURCE_IMPORT_TITLES: Record<SourceId, string> = {
  'web-pages': 'Import web pages',
  'files': 'Import files',
  'corpuswalker': 'Import CorpusWalker',
  'labelstudio': 'Import Label Studio',
  'irit-zip': 'Import IRIT archive',
  'full-corpus-export': 'Import STAR-Q export',
}

const SINGLE_FILE_SOURCE_FORMATS: Record<SingleFileSourceId, CorpusImportFormat> = {
  'corpuswalker': 'corpuswalker',
  'labelstudio': 'labelstudio',
  'irit-zip': 'irit-zip',
  'full-corpus-export': 'full-corpus-export',
}

const ACCEPTED_EXTENSIONS = [...new Set(Object.values(CORPUS_IMPORT_FORMATS).flatMap(config => config.extensions))]

const MAX_IMPORT_SIZE_MB = MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024)

function outcomeFromResult({ count, errors, warnings }: ImportDocumentsResult): ImportItemOutcome {
  if (errors.length > 0) {
    return { status: 'error', message: errors.join('\n') }
  }
  return {
    status: 'imported',
    count,
    message: warnings.length > 0 ? warnings.join('\n') : undefined,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FormatSelect({ id, className, value, onValueChange }: { id?: string, className?: string, value: CorpusImportFormat, onValueChange: (format: CorpusImportFormat) => void }) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isCorpusImportFormat(next))
          onValueChange(next)
      }}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CORPUS_IMPORT_FORMAT_IDS.map(format => (
          <SelectItem key={format} value={format}>
            {CORPUS_IMPORT_FORMATS[format].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DropZone({ accept, multiple = false, onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const files = Array.from(event.dataTransfer.files)
          if (files.length > 0) {
            onFiles(files)
          }
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-muted/40',
          isDragging && 'border-ring bg-muted/40',
        )}
      >
        <FileUpIcon className="size-5" />
        <span>Drag files here or browse</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) {
            onFiles(files)
          }
          event.target.value = ''
        }}
      />
    </>
  )
}

type ImportWizardProps = {
  corpusId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFinished?: (corpusId: string) => void
}

export function ImportWizard({ corpusId, open, onOpenChange, onFinished }: ImportWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('source')
  const [source, setSource] = useState<SourceId | null>(null)
  const [items, setItems] = useState<ImportItem[]>([])
  const [urlText, setUrlText] = useState('')
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const cancelRunRef = useRef(false)
  const [wasOpen, setWasOpen] = useState(open)

  const urls = splitUrlList(urlText)
  const isRunning = items.some(item => item.status === 'importing')
  const importedCount = items.filter(item => item.status === 'imported').length
  const activeSource = SOURCES.find(entry => entry.id === source) ?? null

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      cancelRunRef.current = false
      setStep('source')
      setSource(null)
      setItems([])
      setUrlText('')
      setStagedFiles([])
      setPickedFile(null)
    }
  }

  const closeWizard = () => {
    cancelRunRef.current = true
    if (importedCount > 0) {
      onFinished?.(corpusId)
    }
    onOpenChange(false)
  }

  const importOne = async (item: ImportItem): Promise<ImportItemOutcome> => {
    try {
      if (item.kind === 'url') {
        return outcomeFromResult(await importDocumentsFromUrl(corpusId, item.label))
      }
      const formData = new FormData()
      formData.append('file', item.file)
      return outcomeFromResult(await importDocuments(corpusId, item.format, formData))
    } catch {
      return { status: 'error', message: 'Failed to import. Please try again.' }
    }
  }

  const startRun = async (runItems: ImportItem[]) => {
    if (runItems.length === 0) {
      return
    }
    cancelRunRef.current = false
    setStep('results')
    setItems(runItems)
    let runImportedCount = 0
    for (const item of runItems) {
      if (cancelRunRef.current) {
        break
      }
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, status: 'importing' } : entry))
      const outcome = await importOne(item)
      if (outcome.status === 'imported') {
        runImportedCount += 1
      }
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, ...outcome } : entry))
    }
    if (runImportedCount > 0) {
      router.refresh()
    }
  }

  const retryItem = async (itemId: string) => {
    const item = items.find(entry => entry.id === itemId)
    if (!item || isRunning) {
      return
    }
    setItems(current => current.map(entry => entry.id === itemId ? { ...entry, status: 'importing' } : entry))
    const outcome = await importOne(item)
    setItems(current => current.map(entry => entry.id === itemId ? { ...entry, ...outcome } : entry))
    if (outcome.status === 'imported') {
      router.refresh()
    }
  }

  const startImport = () => {
    if (!source) {
      return
    }
    if (source === 'web-pages') {
      startRun(urls.map(url => ({
        id: crypto.randomUUID(),
        kind: 'url' as const,
        label: url,
        status: 'queued' as const,
      })))
    } else if (source === 'files') {
      startRun(stagedFiles
        .filter((entry): entry is StagedFile & { format: CorpusImportFormat } => entry.format !== null)
        .map(entry => ({
          id: entry.id,
          kind: 'file' as const,
          label: entry.file.name,
          file: entry.file,
          format: entry.format,
          status: 'queued' as const,
        })))
    } else if (pickedFile) {
      startRun([{
        id: crypto.randomUUID(),
        kind: 'file' as const,
        label: pickedFile.name,
        file: pickedFile,
        format: SINGLE_FILE_SOURCE_FORMATS[source],
        status: 'queued',
      }])
    }
  }

  const addStagedFiles = (files: File[]) => {
    setStagedFiles(current => [
      ...current,
      ...files.map(file => ({
        id: crypto.randomUUID(),
        file,
        format: formatForFileName(file.name),
      })),
    ])
  }

  const removeStagedFile = (id: string) => {
    setStagedFiles(current => current.filter(entry => entry.id !== id))
  }

  const setStagedFormat = (id: string, format: CorpusImportFormat) => {
    setStagedFiles(current => current.map(entry => entry.id === id ? { ...entry, format } : entry))
  }

  const importMore = () => {
    setItems([])
    setUrlText('')
    setStagedFiles([])
    setPickedFile(null)
    setStep('configure')
  }

  const canStartImport = source === 'web-pages'
    ? urls.length > 0
    : source === 'files'
      ? stagedFiles.some(entry => entry.format !== null)
      : source !== null && pickedFile !== null

  const importButtonLabel = source === 'web-pages'
    ? `Import ${urls.length} ${urls.length === 1 ? 'URL' : 'URLs'}`
    : source === 'files'
      ? (() => {
          const count = stagedFiles.filter(entry => entry.format !== null).length
          return `Import ${count} ${count === 1 ? 'file' : 'files'}`
        })()
      : 'Import'

  const dialogDescription = step === 'source'
    ? 'Choose where the documents come from.'
    : step === 'configure'
      ? activeSource?.description ?? ''
      : isRunning
        ? 'Importing…'
        : `${importedCount} of ${items.length} imported`

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next)
          closeWizard()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activeSource ? SOURCE_IMPORT_TITLES[activeSource.id] : 'Import documents'}</DialogTitle>
          <DialogDescription aria-live="polite">{dialogDescription}</DialogDescription>
        </DialogHeader>

        {step === 'source' && (
          <div className="grid gap-2">
            {SOURCES.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSource(option.id)
                  setStep('configure')
                }}
                className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-ring hover:bg-muted/40"
              >
                <option.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="block text-sm text-muted-foreground">{option.description}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 'configure' && source === 'web-pages' && (
          <div className="space-y-2">
            <Label htmlFor="import-wizard-urls">URLs</Label>
            <Textarea
              id="import-wizard-urls"
              value={urlText}
              onChange={event => setUrlText(event.target.value)}
              placeholder={'https://example.com/article\nhttps://…'}
              className="font-mono"
              rows={6}
            />
          </div>
        )}

        {step === 'configure' && source === 'files' && (
          <div className="space-y-4">
            <DropZone multiple onFiles={addStagedFiles} />
            {stagedFiles.length > 0 && (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {stagedFiles.map(entry => (
                  <div key={entry.id} className="flex items-center gap-2 rounded-md border border-dashed p-2">
                    <FileUpIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{entry.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</p>
                    </div>
                    {entry.format === null
                      ? <Badge variant="destructive">Unsupported extension</Badge>
                      : (
                          <FormatSelect
                            value={entry.format}
                            onValueChange={next => setStagedFormat(entry.id, next)}
                            className="h-8 w-40 shrink-0"
                          />
                        )}
                    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => removeStagedFile(entry.id)}>
                      <XIcon className="size-4" />
                      <span className="sr-only">{`Remove ${entry.file.name}`}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {'Accepted extensions: '}
              {ACCEPTED_EXTENSIONS.join(', ')}
              .
            </p>
            <p className="text-sm text-muted-foreground">
              {'Maximum '}
              {MAX_IMPORT_SIZE_MB}
              {' MB per file.'}
            </p>
          </div>
        )}

        {step === 'configure' && source !== null && source !== 'web-pages' && source !== 'files' && (
          <div className="space-y-4">
            <DropZone accept={importFormatAccept(SINGLE_FILE_SOURCE_FORMATS[source])} onFiles={files => setPickedFile(files[0] ?? null)} />
            {pickedFile && (
              <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileUpIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{pickedFile.name}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPickedFile(null)}>
                  Remove
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Expected file:
              {' '}
              {CORPUS_IMPORT_FORMATS[SINGLE_FILE_SOURCE_FORMATS[source]].extensions.join(', ')}
            </p>
          </div>
        )}

        {step === 'results' && (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {items.map(item => (
              <div key={item.id} className="flex items-start gap-2 rounded-md border p-2">
                <span className="mt-0.5 shrink-0">
                  {item.status === 'queued' && <CircleDashedIcon className="size-4 text-muted-foreground" />}
                  {item.status === 'importing' && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
                  {item.status === 'imported' && item.message && <TriangleAlertIcon className="size-4 text-warning" />}
                  {item.status === 'imported' && !item.message && <CheckIcon className="size-4 text-success" />}
                  {item.status === 'error' && <CircleXIcon className="size-4 text-destructive" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.label}</p>
                  {item.status === 'imported' && item.count !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {item.count}
                      {' '}
                      {item.count === 1 ? 'document' : 'documents'}
                    </p>
                  )}
                  {item.message && (
                    <p className={cn('text-xs whitespace-pre-line', item.status === 'error' ? 'text-destructive' : 'text-warning-foreground')}>
                      {item.message}
                    </p>
                  )}
                </div>
                {item.status === 'error' && !isRunning && (
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => retryItem(item.id)}>
                    <RotateCcwIcon className="mr-1 size-3" />
                    Retry
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {step === 'source' && (
            <Button variant="outline" onClick={closeWizard}>
              Cancel
            </Button>
          )}
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => setStep('source')}>
                <ChevronLeftIcon className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={startImport} disabled={!canStartImport}>
                <FileUpIcon className="mr-2 size-4" />
                {importButtonLabel}
              </Button>
            </>
          )}
          {step === 'results' && isRunning && (
            <Button
              variant="outline"
              onClick={() => {
                cancelRunRef.current = true
              }}
            >
              Cancel
            </Button>
          )}
          {step === 'results' && !isRunning && (
            <>
              {importedCount > 0 && (
                <Button
                  onClick={() => {
                    onFinished?.(corpusId)
                    onOpenChange(false)
                    router.push(`/corpus/${corpusId}`)
                  }}
                >
                  View documents
                </Button>
              )}
              <Button variant="outline" onClick={importMore}>
                Import more
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
