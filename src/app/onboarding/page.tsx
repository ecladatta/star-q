import { redirect } from 'next/navigation'
import { completeOnboarding } from '@/actions/account/accountActions'
import { auth } from '@/auth'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAppSettings } from '@/lib/app-settings'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const settings = await getAppSettings()
  if (!settings.setupCompletedAt) {
    redirect('/setup')
  }
  const session = await auth()
  if (!session?.user?.valid) {
    redirect('/sign-in')
  }
  if (session.user.username) {
    redirect('/')
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Complete your account</h1>
        <p className="text-sm text-muted-foreground">Choose the unique username other users will use to invite you.</p>
      </div>
      <ServerActionForm action={completeOnboarding} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" name="name" defaultValue={session.user.name ?? ''} required maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" required minLength={3} maxLength={32} />
        </div>
        <Button type="submit" className="w-full">Continue</Button>
      </ServerActionForm>
    </main>
  )
}
