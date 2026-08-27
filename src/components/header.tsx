import type { BreadcrumbCrumb } from '@/components/header-breadcrumbs'
import type { Corpus, Document } from '@/db/schema'
import Link from 'next/link'
import { getPendingInvitationCount } from '@/actions/collaboration/collaborationActions'
import { auth } from '@/auth'
import { HeaderBreadcrumbs } from '@/components/header-breadcrumbs'
import { HeaderNav } from '@/components/header-nav'
import { Button } from '@/components/ui/button'
import { getAppSettings } from '@/lib/app-settings'
import { APP_NAME } from '@/lib/config'
import pkg from '../../package.json'

type HeaderProps = {
  corpus?: Corpus
  document?: Document
  crumbs?: BreadcrumbCrumb[]
}

async function Header({ corpus, document, crumbs }: HeaderProps) {
  const [session, settings] = await Promise.all([auth(), getAppSettings()])
  const signedIn = Boolean(session?.user?.valid && session.user.username && !session.user.mustChangePassword)
  const invitationCount = signedIn ? await getPendingInvitationCount() : 0

  return (
    <header className="fixed inset-x-0 top-0 z-10 border-b bg-white">
      <nav className="flex min-h-14 items-center justify-between gap-4 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-lg font-semibold">
            <Link href="/" aria-label="Home">
              {APP_NAME}
              <span className="ml-1 text-xs font-normal text-gray-400">
                v
                {pkg.version}
              </span>
            </Link>
          </h1>
          {(corpus || document || crumbs?.length) && (
            <>
              <span className="hidden shrink-0 text-gray-400 md:block">/</span>
              <HeaderBreadcrumbs corpus={corpus} document={document} crumbs={crumbs} />
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {signedIn
            ? <HeaderNav invitationCount={invitationCount} username={session!.user.username ?? ''} isAdmin={session!.user.role === 'admin'} />
            : settings.setupCompletedAt
              ? (
                  <>
                    <Button variant="ghost" size="sm" asChild><Link href="/browse">Browse</Link></Button>
                    {settings.signupEnabled && settings.signinEnabled && <Button variant="ghost" size="sm" asChild><Link href="/sign-up">Sign up</Link></Button>}
                    <Button variant="outline" size="sm" asChild><Link href="/sign-in">Sign in</Link></Button>
                  </>
                )
              : <Button variant="outline" size="sm" asChild><Link href="/setup">Set up</Link></Button>}
        </div>
      </nav>
    </header>
  )
}

export default Header
