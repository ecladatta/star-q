import type { ReactNode } from 'react'
import { getPendingInvitationCount } from '@/actions/collaboration/collaborationActions'
import { getMyCorpora } from '@/actions/corpus/corpusActions'
import { auth } from '@/auth'
import { GuestBar } from '@/components/shell/guest-bar'
import { TopNav } from '@/components/shell/top-nav'
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
    <div className="flex h-dvh flex-col overflow-hidden">
      {user
        ? (
            <TopNav user={user} />
          )
        : (
            <GuestBar
              setupCompleted={Boolean(settings.setupCompletedAt)}
              signupEnabled={settings.signupEnabled}
              signinEnabled={settings.signinEnabled}
            />
          )}
      <main className="min-h-0 min-w-0 flex-1">{children}</main>
    </div>
  )
}
