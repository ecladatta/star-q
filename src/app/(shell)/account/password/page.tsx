import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Page, PageHeader } from '@/components/page'
import { PasswordForm } from '@/components/password-form'
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
      <PasswordForm hasPassword={Boolean(user.passwordHash) && !user.mustChangePassword} />
    </Page>
  )
}
