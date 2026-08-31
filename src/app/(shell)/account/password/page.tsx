import { redirect } from 'next/navigation'
import { changeOwnPassword } from '@/actions/account/accountActions'
import { auth } from '@/auth'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isLocalCredentialsEnabled } from '@/lib/app-settings'
import { getAuthenticatedUserForOnboarding } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export default async function PasswordPage() {
  if (!isLocalCredentialsEnabled()) {
    redirect('/account')
  }
  const session = await auth()
  if (!session?.user?.valid) {
    redirect('/sign-in')
  }
  const user = await getAuthenticatedUserForOnboarding()
  const title = user.mustChangePassword ? 'Change temporary password' : user.passwordHash ? 'Change password' : 'Add password'
  return (
    <Page>
      <PageHeader title={title} description="Keep your password strong and unique to this account." />
      <ServerActionForm action={changeOwnPassword} className="max-w-lg space-y-4">
        {user.passwordHash && (
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" minLength={4} maxLength={128} required autoComplete="new-password" />
          <p className="text-xs text-muted-foreground">Between 4 and 128 characters.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="passwordConfirmation">Confirm password</Label>
          <Input id="passwordConfirmation" name="passwordConfirmation" type="password" minLength={4} maxLength={128} required autoComplete="new-password" />
        </div>
        <Button type="submit">Save password</Button>
      </ServerActionForm>
    </Page>
  )
}
