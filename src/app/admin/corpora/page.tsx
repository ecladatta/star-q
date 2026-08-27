import Link from 'next/link'
import { getAdminCorpuses } from '@/actions/admin/adminActions'

export const dynamic = 'force-dynamic'
export default async function AdminCorpusesPage() {
  const corpora = await getAdminCorpuses()
  return (
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <h1 className="text-3xl font-semibold">All corpora</h1>
      <section className="rounded-md border">
        {corpora.map(item => (
          <Link key={item.id} href={`/corpus/${item.id}`} className="flex justify-between border-b p-4 last:border-0 hover:bg-muted/50">
            <span>{item.title}</span>
            <span className="text-sm text-muted-foreground capitalize">
              {item.ownerType}
              {' '}
              ·
              {' '}
              {item.visibility}
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
