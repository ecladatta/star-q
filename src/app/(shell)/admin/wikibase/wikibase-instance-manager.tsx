'use client'

import type { WikibaseInstance } from '@/db/schema'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { createWikibaseInstance, deleteWikibaseInstance, updateWikibaseInstance } from '@/actions/wikibase/wikibaseAdminActions'
import { ConfirmActionButton } from '@/components/confirm-action-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type InstanceDraft = {
  label: string
  instanceUrl: string
  sparqlEndpoint: string
}

const EMPTY_DRAFT: InstanceDraft = { label: '', instanceUrl: '', sparqlEndpoint: '' }

function toDraft(instance: WikibaseInstance): InstanceDraft {
  return { label: instance.label, instanceUrl: instance.instanceUrl, sparqlEndpoint: instance.sparqlEndpoint }
}

function draftComplete(draft: InstanceDraft): boolean {
  return Boolean(draft.label.trim() && draft.instanceUrl.trim() && draft.sparqlEndpoint.trim())
}

export function WikibaseInstanceManager({ instances }: { instances: WikibaseInstance[] }) {
  const router = useRouter()
  const [newInstance, setNewInstance] = useState<InstanceDraft>(EMPTY_DRAFT)
  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<WikibaseInstance | null>(null)
  const [editDraft, setEditDraft] = useState<InstanceDraft>(EMPTY_DRAFT)
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async () => {
    if (!draftComplete(newInstance)) {
      return
    }
    try {
      setIsCreating(true)
      await createWikibaseInstance(newInstance)
      setNewInstance(EMPTY_DRAFT)
      toast.success('Wikibase instance registered')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to register the Wikibase instance.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing || !draftComplete(editDraft)) {
      return
    }
    try {
      setIsSaving(true)
      await updateWikibaseInstance(editing.id, editDraft)
      setEditing(null)
      toast.success('Wikibase instance updated')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update the Wikibase instance.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-md border p-5">
        <h2 className="mb-4 text-lg font-semibold">Register instance</h2>
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <div className="space-y-2">
            <Label htmlFor="wikibase-label">Label</Label>
            <Input
              id="wikibase-label"
              value={newInstance.label}
              onChange={e => setNewInstance(prev => ({ ...prev, label: e.target.value }))}
              placeholder="e.g. Wikidata"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wikibase-instance-url">Instance URL</Label>
            <Input
              id="wikibase-instance-url"
              value={newInstance.instanceUrl}
              onChange={e => setNewInstance(prev => ({ ...prev, instanceUrl: e.target.value }))}
              placeholder="https://www.wikidata.org"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wikibase-sparql-endpoint">SPARQL endpoint</Label>
            <Input
              id="wikibase-sparql-endpoint"
              value={newInstance.sparqlEndpoint}
              onChange={e => setNewInstance(prev => ({ ...prev, sparqlEndpoint: e.target.value }))}
              placeholder="https://query.wikidata.org/sparql"
            />
          </div>
          <Button onClick={handleCreate} disabled={isCreating || !draftComplete(newInstance)}>
            {isCreating ? 'Registering…' : 'Register'}
          </Button>
        </div>
      </section>

      <section className="w-full overflow-hidden rounded-lg border border-border">
        {instances.map(instance => (
          <div key={instance.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border p-4 last:border-0">
            <div>
              <p className="text-sm font-medium">{instance.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">{instance.instanceUrl}</code>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                SPARQL
                {' '}
                <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">{instance.sparqlEndpoint}</code>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(instance)
                setEditDraft(toDraft(instance))
              }}
            >
              Edit
            </Button>
            <ConfirmActionButton
              action={async () => {
                await deleteWikibaseInstance(instance.id)
                router.refresh()
              }}
              title="Remove this Wikibase instance?"
              description={(
                <span>
                  This permanently removes
                  {' '}
                  <strong>{instance.label}</strong>
                  {' '}
                  from the registry. Removal fails while any corpus still selects it.
                </span>
              )}
              confirmLabel="Remove instance"
              variant="destructive"
              successMessage="Wikibase instance removed"
            >
              Remove
            </ConfirmActionButton>
          </div>
        ))}
        {instances.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No instances registered yet.</p>
        )}
      </section>

      <Dialog open={editing !== null} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit instance</DialogTitle>
            <DialogDescription>
              Corpus settings pointing at this instance follow the updated URLs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wikibase-edit-label">Label</Label>
              <Input
                id="wikibase-edit-label"
                value={editDraft.label}
                onChange={e => setEditDraft(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wikibase-edit-instance-url">Instance URL</Label>
              <Input
                id="wikibase-edit-instance-url"
                value={editDraft.instanceUrl}
                onChange={e => setEditDraft(prev => ({ ...prev, instanceUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wikibase-edit-sparql-endpoint">SPARQL endpoint</Label>
              <Input
                id="wikibase-edit-sparql-endpoint"
                value={editDraft.sparqlEndpoint}
                onChange={e => setEditDraft(prev => ({ ...prev, sparqlEndpoint: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving || !draftComplete(editDraft)}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
