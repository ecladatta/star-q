'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { testWikibaseInstance } from '@/actions/wikibase/wikibaseAdminActions'
import { Button } from '@/components/ui/button'

export function TestConnectionButton({ instanceUrl, sparqlEndpoint }: { instanceUrl: string, sparqlEndpoint: string }) {
  const [pending, setPending] = useState(false)

  const handleTest = async () => {
    setPending(true)
    try {
      const result = await testWikibaseInstance({ instanceUrl, sparqlEndpoint })
      if (result.instanceApi.ok && result.sparql.ok) {
        toast.success('Connection test passed', { description: 'Instance API and SPARQL endpoint responded correctly.' })
      } else {
        toast.error('Connection test failed', {
          description: (
            <div className="grid gap-0.5">
              <span>{`Instance API: ${result.instanceApi.ok ? 'OK' : result.instanceApi.error}`}</span>
              <span>{`SPARQL: ${result.sparql.ok ? 'OK' : result.sparql.error}`}</span>
            </div>
          ),
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection test failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleTest}
      disabled={pending || !instanceUrl.trim() || !sparqlEndpoint.trim()}
    >
      {pending ? 'Testing…' : 'Test'}
    </Button>
  )
}
