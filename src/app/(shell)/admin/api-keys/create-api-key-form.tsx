'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { createAdminApiKey } from '@/actions/admin/apiKeyActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CreatedKey = { name: string, rawKey: string }

export function CreateApiKeyForm() {
  const [created, formAction, pending] = useActionState<CreatedKey | null, FormData>(
    async (_previous, formData) => {
      try {
        const name = String(formData.get('name'))
        const { rawKey } = await createAdminApiKey({ name })
        return { name, rawKey }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create API key.')
        return null
      }
    },
    null,
  )

  if (created) {
    return (
      <section className="rounded-md border p-5">
        <p className="font-medium">{created.name}</p>
        <p className="text-sm text-muted-foreground">Copy this key now. It will not be shown again.</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm break-all">{created.rawKey}</code>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(created.rawKey)
              toast.success('API key copied to clipboard')
            }}
          >
            Copy
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-md border p-5">
      <h2 className="mb-4 text-lg font-semibold">Create API key</h2>
      <form action={formAction} className="flex items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="e.g. CI export" required disabled={pending} />
        </div>
        <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create API key'}</Button>
      </form>
    </section>
  )
}
