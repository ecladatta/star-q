import Link from 'next/link'
import { getAdminCorpora } from '@/actions/admin/adminActions'
import { Page, PageHeader } from '@/components/page'

export const dynamic = 'force-dynamic'
export default async function AdminCorporaPage() {
  const corpora = await getAdminCorpora()
  return (
    <Page>
      <PageHeader
        title="All corpora"
        description={`${corpora.length} corpora on this instance`}
      />
      <section className="w-full overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Corpus</th>
              <th className="px-3 py-2 text-left font-medium">Owner</th>
              <th className="px-3 py-2 text-left font-medium">Visibility</th>
            </tr>
          </thead>
          <tbody>
            {corpora.map(corpus => (
              <tr key={corpus.id} className="border-t border-border transition-colors hover:bg-muted/30">
                <td className="px-3 py-2.5 text-[13px]">
                  <Link href={`/corpus/${corpus.id}`} className="font-medium text-foreground hover:text-accent hover:underline">
                    {corpus.title ?? 'Untitled corpus'}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-[13px]">
                  <Link href={`/teams/${corpus.ownerIdentifier}`} className="text-muted-foreground hover:text-accent hover:underline">
                    {corpus.ownerName}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-[13px] text-muted-foreground capitalize">{corpus.visibility}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  )
}
