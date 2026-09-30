import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyAcceptedCorpusCollaborations, getPendingInvitations, leaveCorpusCollaboration, respondToCorpusInvitation } from '@/actions/collaboration/collaborationActions'
import { respondToTeamInvitation } from '@/actions/team/teamActions'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { getAppSettings } from '@/lib/app-settings'
import { requirePageUser } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export default async function InvitationsPage() {
  if (!(await getAppSettings()).setupCompletedAt) {
    redirect('/setup')
  }
  await requirePageUser()
  const [invitations, accepted] = await Promise.all([
    getPendingInvitations(),
    getMyAcceptedCorpusCollaborations(),
  ])
  const pendingViews: PendingInvitationView[] = [
    ...invitations.teamInvitations.map((invitation) => {
      const inviter = formatInviter(invitation.inviterName, invitation.inviterUsername)
      const inviterSentence = inviter ? `${inviter} invited you` : null
      return {
        key: invitation.id,
        title: `Join ${invitation.teamName}`,
        detail: buildDetail(inviterSentence, invitation.role, invitation.createdAt),
        accept: respondToTeamInvitation.bind(null, invitation.id, 'accepted'),
        decline: respondToTeamInvitation.bind(null, invitation.id, 'declined'),
      }
    }),
    ...invitations.userCorpusInvitations.map((invitation) => {
      const inviter = formatInviter(invitation.inviterName, invitation.inviterUsername)
      const inviterSentence = inviter ? `${inviter} invited you` : null
      return {
        key: invitation.id,
        title: `Collaborate on ${invitation.corpusTitle}`,
        detail: buildDetail(inviterSentence, invitation.role, invitation.createdAt),
        accept: respondToCorpusInvitation.bind(null, invitation.id, 'accepted'),
        decline: respondToCorpusInvitation.bind(null, invitation.id, 'declined'),
      }
    }),
    ...invitations.teamCorpusInvitations.map((invitation) => {
      const inviter = formatInviter(invitation.inviterName, invitation.inviterUsername)
      const inviterSentence = inviter ? `${inviter} invited team ${invitation.teamName}` : null
      return {
        key: invitation.id,
        title: `Collaborate on ${invitation.corpusTitle}`,
        detail: buildDetail(inviterSentence, invitation.role, invitation.createdAt),
        accept: respondToCorpusInvitation.bind(null, invitation.id, 'accepted'),
        decline: respondToCorpusInvitation.bind(null, invitation.id, 'declined'),
      }
    }),
  ]
  return (
    <Page>
      <PageHeader title="Invitations" />
      <section className="space-y-3">
        {pendingViews.map(view => (
          <InvitationRow key={view.key} title={view.title} detail={view.detail} accept={view.accept} decline={view.decline} />
        ))}
        {pendingViews.length === 0 && <p className="text-sm text-muted-foreground">No pending invitations.</p>}
      </section>
      {(accepted.direct.length > 0 || accepted.forTeams.length > 0) && (
        <section className="mt-8 space-y-3">
          <div>
            <h2 className="text-sm font-medium">Accepted collaborations</h2>
            <p className="mt-1 text-xs text-muted-foreground">Leaving removes the access granted by that invitation.</p>
          </div>
          {accepted.direct.map(collaboration => (
            <AcceptedCollaborationRow
              key={collaboration.id}
              title={collaboration.corpusTitle ?? 'Untitled corpus'}
              detail={`You collaborate as ${capitalizeRole(collaboration.role)}`}
              href={`/corpus/${collaboration.corpusId}`}
              leave={leaveCorpusCollaboration.bind(null, collaboration.id)}
            />
          ))}
          {accepted.forTeams.map(collaboration => (
            <AcceptedCollaborationRow
              key={collaboration.id}
              title={collaboration.corpusTitle ?? 'Untitled corpus'}
              detail={`${collaboration.teamName} collaborates as ${capitalizeRole(collaboration.role)}`}
              href={`/corpus/${collaboration.corpusId}`}
              leave={leaveCorpusCollaboration.bind(null, collaboration.id)}
            />
          ))}
        </section>
      )}
    </Page>
  )
}

function AcceptedCollaborationRow({ title, detail, href, leave }: { title: string, detail: string, href?: string, leave: () => Promise<void> }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">
          {href ? <Link href={href}>{title}</Link> : title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-success">Accepted</span>
        <ServerActionForm action={leave}><Button type="submit" variant="outline" size="sm" className="h-8 text-destructive">Leave</Button></ServerActionForm>
      </div>
    </div>
  )
}

function InvitationRow({ title, detail, accept, decline, acceptMessage = 'Invitation accepted' }: { title: string, detail: string, accept: () => Promise<void>, decline: () => Promise<void>, acceptMessage?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ServerActionForm action={decline}><Button type="submit" variant="outline" size="sm" className="h-8">Decline</Button></ServerActionForm>
        <ServerActionForm action={accept} successMessage={acceptMessage}><Button type="submit" size="sm" className="h-8">Accept</Button></ServerActionForm>
      </div>
    </div>
  )
}

type PendingInvitationView = {
  key: string
  title: string
  detail: string
  accept: () => Promise<void>
  decline: () => Promise<void>
}

function buildDetail(inviterSentence: string | null, role: string, sentAt: Date): string {
  return [inviterSentence, formatRole(role), formatSentAt(sentAt)].filter(Boolean).join(' · ')
}

function capitalizeRole(role: string): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`
}

function formatInviter(inviterName: string | null, inviterUsername: string | null): string | null {
  if (inviterName && inviterUsername)
    return `${inviterName} (@${inviterUsername})`
  if (inviterName)
    return inviterName
  if (inviterUsername)
    return `@${inviterUsername}`
  return null
}

function formatRole(role: string): string {
  return `as ${capitalizeRole(role)}`
}

function formatSentAt(sentAt: Date): string {
  const elapsedMinutes = Math.floor((Date.now() - sentAt.getTime()) / 60_000)
  if (elapsedMinutes < 1)
    return 'just now'
  if (elapsedMinutes < 60)
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24)
    return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`
  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays < 7)
    return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`
  return sentAt.toLocaleDateString()
}
