'use client'

import type { CorpusVisibility } from '@/db/schema'
import { useState } from 'react'
import { toast } from 'sonner'
import { updateCorpusVisibility } from '@/actions/corpus/corpusActions'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CorpusVisibilitySelectProps = {
  corpusId: string
  visibility: CorpusVisibility
}

export function CorpusVisibilitySelect({ corpusId, visibility }: CorpusVisibilitySelectProps) {
  const [currentVisibility, setCurrentVisibility] = useState<CorpusVisibility>(visibility)
  const [isSaving, setIsSaving] = useState(false)

  const handleVisibilityChange = async (value: CorpusVisibility) => {
    const previous = currentVisibility
    setCurrentVisibility(value)
    try {
      setIsSaving(true)
      await updateCorpusVisibility(corpusId, value)
      toast.success(value === 'public' ? 'Corpus is now public' : 'Corpus is now private')
    } catch {
      setCurrentVisibility(previous)
      toast.error('Failed to update corpus visibility')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor="corpus-visibility">
          Who can view this corpus?
        </Label>
        <p className="text-xs text-muted-foreground">
          Public corpora are readable by anyone without signing in. Editing still requires explicit access.
        </p>
      </div>
      <Select
        value={currentVisibility}
        onValueChange={handleVisibilityChange}
        disabled={isSaving}
      >
        <SelectTrigger id="corpus-visibility" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="private">Private</SelectItem>
          <SelectItem value="public">Public</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
