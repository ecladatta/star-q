import { CheckIcon, ChevronDownIcon, DownloadIcon, EllipsisIcon, SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'
import { getAdminAuditLog } from '@/actions/admin/adminActions'
import { Page } from '@/components/page'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { AUDIT_ACTION_CATEGORIES, describeAuditEvent, relativeTime } from '@/lib/audit-log-display'

export const dynamic = 'force-dynamic'

type AuditEvent = Awaited<ReturnType<typeof getAdminAuditLog>>[number]

function AuditAvatar({ username, image }: { username: string | null, image: string | null }) {
  if (image) {
    return <img src={image} alt={username ?? 'Unknown user'} className="size-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
    >
      {username ? username.charAt(0).toUpperCase() : '—'}
    </span>
  )
}

function buildAuditPayloadEntries(event: AuditEvent): [string, unknown][] {
  const own: [string, unknown][] = [
    ['id', event.id],
    ['timestamp', event.createdAt.toISOString()],
    ['actor_user_id', event.actorUserId],
    ['action', event.action],
    ['target_type', event.targetType],
    ['target_id', event.targetId],
  ]
  return [...own, ...Object.entries(event.metadata ?? {})].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
}

function formatAuditPayloadValue(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return String(value)
  }
  return JSON.stringify(value)
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string, action?: string }> }) {
  const { q, action } = await searchParams
  const activeCategory = AUDIT_ACTION_CATEGORIES.find(category => category.id === action)
  const events = await getAdminAuditLog({ q, action: activeCategory?.id })

  const auditHref = (nextAction?: string) => {
    const params = new URLSearchParams()
    if (q) {
      params.set('q', q)
    }
    if (nextAction) {
      params.set('action', nextAction)
    }
    const query = params.toString()
    return query ? `/admin/audit?${query}` : '/admin/audit'
  }

  const exportHref = (format: 'json' | 'csv') => {
    const params = new URLSearchParams()
    params.set('format', format)
    if (q) {
      params.set('q', q)
    }
    if (activeCategory) {
      params.set('action', activeCategory.id)
    }
    return `/api/admin/audit-log/export?${params.toString()}`
  }

  return (
    <Page>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Filters
              <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href={auditHref()}>
                {!activeCategory && <CheckIcon className="size-4" />}
                All actions
              </Link>
            </DropdownMenuItem>
            {AUDIT_ACTION_CATEGORIES.map(category => (
              <DropdownMenuItem key={category.id} asChild>
                <Link href={auditHref(category.id)}>
                  {category.id === activeCategory?.id && <CheckIcon className="size-4" />}
                  {category.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <form action="/admin/audit" method="GET" className="min-w-48 flex-1">
          {activeCategory && <input type="hidden" name="action" value={activeCategory.id} />}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" placeholder="Search audit logs" defaultValue={q ?? ''} className="pl-8" />
          </div>
        </form>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <DownloadIcon className="size-4" />
              Export
              <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={exportHref('json')} download>Export JSON</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={exportHref('csv')} download>Export CSV</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <section className="w-full overflow-hidden rounded-lg border border-border">
        <header className="flex items-baseline gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <h2 className="font-medium">Recent events</h2>
          <span className="text-sm text-muted-foreground">Latest 500 events · retained for 180 days.</span>
        </header>
        {events.length === 0
          ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No events match your search.</p>
            )
          : (
              <ul>
                {events.map((event, index) => (
                  <li
                    key={event.id}
                    className={index === events.length - 1 ? 'px-4 py-3' : 'border-b border-border px-4 py-3'}
                  >
                    <div className="flex gap-3">
                      <AuditAvatar username={event.actorUsername} image={event.actorImage} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium text-primary">{event.actorUsername ?? 'Unknown user'}</span>
                          {' – '}
                          <span className="font-medium text-primary">{event.action}</span>
                        </p>
                        <p className="text-sm text-foreground">{describeAuditEvent(event)}</p>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          <span>{relativeTime(event.createdAt)}</span>
                          {' '}
                          <details className="inline">
                            <summary className="inline-flex size-6 cursor-pointer list-none items-center justify-center rounded-md align-middle text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                              <EllipsisIcon className="size-4" />
                            </summary>
                            <div className="mt-2 grid w-full grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
                              {buildAuditPayloadEntries(event).map(([key, value], entryIndex) => {
                                const isNil = value === null || value === undefined || value === ''
                                const text = formatAuditPayloadValue(value)
                                return (
                                  <Fragment key={`${key}:${entryIndex}`}>
                                    <span className="font-medium text-foreground">{key}</span>
                                    {isNil
                                      ? (
                                          <span className="text-muted-foreground italic">nil</span>
                                        )
                                      : (
                                          <span title={text.length > 120 ? text : undefined} className="break-all text-muted-foreground">
                                            {text.length > 120 ? `${text.slice(0, 120)}…` : text}
                                          </span>
                                        )}
                                  </Fragment>
                                )
                              })}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
      </section>
    </Page>
  )
}
