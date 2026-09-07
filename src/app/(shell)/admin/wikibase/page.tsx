import { listWikibaseInstances } from '@/actions/wikibase/wikibaseAdminActions'
import { Page, PageHeader } from '@/components/page'
import { WikibaseInstanceManager } from './wikibase-instance-manager'

export const dynamic = 'force-dynamic'

export default async function AdminWikibasePage() {
  const instances = await listWikibaseInstances()
  return (
    <Page>
      <PageHeader
        title="Wikibase instances"
        description="Instances corpora may target for entity links, constraint checks, and SPARQL queries. Corpora without a selection resolve to the server default."
      />
      <WikibaseInstanceManager instances={instances} />
    </Page>
  )
}
