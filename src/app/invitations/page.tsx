import { redirect } from 'next/navigation'
import { getMyAcceptedCorpusCollaborations, getPendingInvitations, leaveCorpusCollaboration, respondToCorpusInvitation } from '@/actions/collaboration/collaborationActions'
import { respondToTeamInvitation } from '@/actions/team/teamActions'
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
  const [invitations, accepted] = await Promise.all([getPendingInvitations(), getMyAcceptedCorpusCollaborations()])
  const total = invitations.teamInvitations.length + invitations.userCorpusInvitations.length + invitations.teamCorpusInvitations.length
  return (
    <main className="container mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Invitations</h1>
        <p className="text-sm text-muted-foreground">Access starts only after an invitation is accepted.</p>
      </div>
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
        {total === 0 && <p className="text-sm text-muted-foreground">No pending invitations.</p>}
      </section>
      {(accepted.direct.length > 0 || accepted.forTeams.length > 0) && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Accepted collaborations</h2>
            <p className="text-sm text-muted-foreground">Leaving removes the access granted by that invitation.</p>
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
    </main>
  )
}

function AcceptedCollaborationRow({ title, detail, leave }: { title: string, detail: string, leave: () => Promise<void> }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <ServerActionForm action={leave}><Button type="submit" variant="outline">Leave</Button></ServerActionForm>
    </div>
  )
}

function InvitationRow({ title, detail, accept, decline }: { title: string, detail: string, accept: () => Promise<void>, decline: () => Promise<void> }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="flex gap-2">
        <ServerActionForm action={decline}><Button type="submit" variant="outline">Decline</Button></ServerActionForm>
        <ServerActionForm action={accept} successMessage="Invitation accepted"><Button type="submit">Accept</Button></ServerActionForm>
      </div>
    </div>
  )
}
