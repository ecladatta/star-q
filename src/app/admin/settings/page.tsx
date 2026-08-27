import { getAdminSettings, updateAdminSettings } from '@/actions/admin/adminActions'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings()
  return (
    <main className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div><h1 className="text-3xl font-semibold">Instance settings</h1></div>
      <section className="space-y-4 rounded-md border p-5">
        <SettingRow title="Signup" description="Allow unknown OAuth identities and local users to register." enabled={settings.signupEnabled} action={updateAdminSettings.bind(null, { signupEnabled: !settings.signupEnabled })} />
        <SettingRow title="Sign-in" description="Allow new user sessions. Existing sessions continue; administrators can always sign in." enabled={settings.signinEnabled} action={updateAdminSettings.bind(null, { signinEnabled: !settings.signinEnabled })} />
      </section>
    </main>
  )
}

function SettingRow({ title, description, enabled, action }: { title: string, description: string, enabled: boolean, action: () => Promise<void> }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ServerActionForm action={action}><Button type="submit" variant={enabled ? 'outline' : 'default'}>{enabled ? 'Disable' : 'Enable'}</Button></ServerActionForm>
    </div>
  )
}
