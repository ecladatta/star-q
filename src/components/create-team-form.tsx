'use client'

import { useState } from 'react'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { slugifyTeamName } from '@/lib/identity'

export function CreateTeamForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  return (
    <ServerActionForm
      action={action}
      className="grid gap-x-4 gap-y-2 sm:grid-cols-[1fr_1fr_auto]"
      successMessage="Team created"
    >
      <div className="space-y-2 sm:col-start-1 sm:row-start-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => {
            const nextName = event.target.value
            setName(nextName)
            if (!slugEdited) {
              setSlug(slugifyTeamName(nextName))
            }
          }}
        />
      </div>
      <div className="space-y-2 sm:col-start-2 sm:row-start-1">
        <Label htmlFor="slug">Unique slug</Label>
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(event) => {
            const nextSlug = event.target.value
            setSlug(nextSlug)
            setSlugEdited(nextSlug.length > 0)
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-start-2 sm:row-start-2">
        Slugs use lowercase letters, digits, and dashes.
      </p>
      <Button type="submit" className="sm:col-start-3 sm:row-start-1 sm:self-end">
        Create
      </Button>
    </ServerActionForm>
  )
}
