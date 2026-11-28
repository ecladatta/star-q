import type { ReactNode } from 'react'
import { getPendingInvitationCount } from '@/actions/collaboration/collaborationActions'
import { getMyCorpora } from '@/actions/corpus/corpusActions'
import { auth } from '@/auth'
import { ShellFooter } from '@/components/shell-footer'
import { GuestBar } from '@/components/shell/guest-bar'
import { TempPasswordBar } from '@/components/shell/temp-password-bar'
import { TopNav } from '@/components/shell/top-nav'
import { SiteFooter } from '@/components/site-footer'
import { getAppSettings } from '@/lib/app-settings'

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getAppSettings()])
  const sessionUser = session?.user
  const signedIn = Boolean(
    sessionUser?.valid
    && sessionUser.username
    && !sessionUser.mustChangePassword,
  )

  let user = null
  if (signedIn && sessionUser) {
    const [invitationCount, corpora] = await Promise.all([
      getPendingInvitationCount(),
      getMyCorpora(),
    ])
    user = {
      username: sessionUser.username as string,
      name: sessionUser.name ?? null,
      isAdmin: sessionUser.role === 'admin',
      invitationCount,
      corpora: corpora.map(corpus => ({ id: corpus.id, title: corpus.title })),
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {user
        ? (
            <TopNav user={user} />
          )
        : sessionUser?.valid && sessionUser.mustChangePassword
          ? (
              <TempPasswordBar />
            )
          : (
              <GuestBar
                setupCompleted={Boolean(settings.setupCompletedAt)}
                signupEnabled={settings.passwordSignupEnabled || settings.oauthSignupEnabled}
                signinEnabled={settings.signinEnabled}
              />
            )}
      <main className="flex flex-1 flex-col">{children}</main>
      <ShellFooter>
        <SiteFooter />
      </ShellFooter>
    </div>
  )
}
