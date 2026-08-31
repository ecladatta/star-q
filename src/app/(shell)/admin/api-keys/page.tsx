import { getAdminApiKeys, revokeAdminApiKey } from '@/actions/admin/apiKeyActions'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { CreateApiKeyForm } from './create-api-key-form'

export const dynamic = 'force-dynamic'

function formatDate(value: Date | null): string {
  return value ? value.toLocaleString() : 'Never'
}

export default async function AdminApiKeysPage() {
  const keys = await getAdminApiKeys()
  return (
    <Page>
      <PageHeader
        title="API keys"
        description={(
          <span>
            Keys grant read-only access to every corpus through the
            {' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">x-api-key</code>
            {' '}
            request header and are shown only once at creation.
          </span>
        )}
      />
      <CreateApiKeyForm />
      <section className="w-full overflow-hidden rounded-lg border border-border">
        {keys.map(key => (
          <div key={key.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border p-4 last:border-0">
            <div>
              <p className="text-sm font-medium">{key.name}</p>
              <p className="text-sm text-muted-foreground">
                <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">
                  {key.keyPrefix}
                  …
                </code>
                {' '}
                created
                {' '}
                {formatDate(key.createdAt)}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              Last used
              {' '}
              {formatDate(key.lastUsedAt)}
            </span>
            <span className={`text-sm capitalize ${key.revokedAt ? 'text-muted-foreground' : ''}`}>{key.revokedAt ? 'Revoked' : 'Active'}</span>
            {key.revokedAt
              ? <span className="w-20" />
              : (
                  <ServerActionForm
                    action={async () => {
                      'use server'
                      await revokeAdminApiKey(key.id)
                    }}
                    successMessage="API key revoked"
                  >
                    <Button type="submit" variant="outline">Revoke</Button>
                  </ServerActionForm>
                )}
          </div>
        ))}
        {keys.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No API keys yet.</p>
        )}
      </section>
    </Page>
  )
}
