import { redirect } from 'next/navigation'
import { getMyAcceptedCorpusCollaborations, getPendingInvitations, leaveCorpusCollaboration, respondToCorpusInvitation } from '@/actions/collaboration/collaborationActions'
import { getMyPendingCorpusOwnershipTransfers, respondToCorpusOwnershipTransfer } from '@/actions/corpus/corpusActions'
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
  const [invitations, ownershipTransfers, accepted] = await Promise.all([
    getPendingInvitations(),
    getMyPendingCorpusOwnershipTransfers(),
    getMyAcceptedCorpusCollaborations(),
  ])
  const total = invitations.teamInvitations.length
    + invitations.userCorpusInvitations.length
    + invitations.teamCorpusInvitations.length
    + ownershipTransfers.direct.length
    + ownershipTransfers.forTeams.length
  return (
    <Page>
      <PageHeader title="Invitations" />
      <section className="space-y-3">
        {invitations.teamInvitations.map(invitation => (
          <InvitationRow key={invitation.id} title={`Join ${invitation.teamName}`} detail={`Team role: ${invitation.role}`} accept={respondToTeamInvitation.bind(null, invitation.id, 'accepted')} decline={respondToTeamInvitation.bind(null, invitation.id, 'declined')} />
        ))}
        {invitations.userCorpusInvitations.map(invitation => (
          <InvitationRow key={invitation.id} title={`Collaborate on ${invitation.corpusTitle}`} detail={`Corpus role: ${invitation.role}`} accept={respondToCorpusInvitation.bind(null, invitation.id, 'accepted')} decline={respondToCorpusInvitation.bind(null, invitation.id, 'declined')} />
        ))}
        {invitations.teamCorpusInvitations.map(invitation => (
          <InvitationRow key={invitation.id} title={`${invitation.teamName} invited to ${invitation.corpusTitle}`} detail={`Corpus role: ${invitation.role}`} accept={respondToCorpusInvitation.bind(null, invitation.id, 'accepted')} decline={respondToCorpusInvitation.bind(null, invitation.id, 'declined')} />
        ))}
        {ownershipTransfers.direct.map(transfer => (
          <InvitationRow key={transfer.id} title={`Take ownership of ${transfer.corpusTitle ?? 'Untitled corpus'}`} detail="Personal corpus ownership" accept={respondToCorpusOwnershipTransfer.bind(null, transfer.id, 'accepted')} decline={respondToCorpusOwnershipTransfer.bind(null, transfer.id, 'declined')} acceptMessage="Ownership transferred" />
        ))}
        {ownershipTransfers.forTeams.map(transfer => (
          <InvitationRow key={transfer.id} title={`${transfer.teamName} can take ownership of ${transfer.corpusTitle ?? 'Untitled corpus'}`} detail="Team corpus ownership" accept={respondToCorpusOwnershipTransfer.bind(null, transfer.id, 'accepted')} decline={respondToCorpusOwnershipTransfer.bind(null, transfer.id, 'declined')} acceptMessage="Ownership transferred" />
        ))}
        {total === 0 && <p className="text-sm text-muted-foreground">No pending invitations.</p>}
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
              detail={`Your role: ${collaboration.role}`}
              leave={leaveCorpusCollaboration.bind(null, collaboration.id)}
            />
          ))}
          {accepted.forTeams.map(collaboration => (
            <AcceptedCollaborationRow
              key={collaboration.id}
              title={collaboration.corpusTitle ?? 'Untitled corpus'}
              detail={`${collaboration.teamName}: ${collaboration.role}`}
              leave={leaveCorpusCollaboration.bind(null, collaboration.id)}
            />
          ))}
        </section>
      )}
    </Page>
  )
}

function AcceptedCollaborationRow({ title, detail, leave }: { title: string, detail: string, leave: () => Promise<void> }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{title}</p>
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
        <span className="inline-flex rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Pending</span>
        <ServerActionForm action={decline}><Button type="submit" variant="outline" size="sm" className="h-8">Decline</Button></ServerActionForm>
        <ServerActionForm action={accept} successMessage={acceptMessage}><Button type="submit" size="sm" className="h-8">Accept</Button></ServerActionForm>
      </div>
    </div>
  )
}
