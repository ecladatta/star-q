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
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      successMessage="Team created"
    >
      <div className="space-y-2">
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
      <div className="space-y-2">
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
      <Button type="submit">Create</Button>
    </ServerActionForm>
  )
}
