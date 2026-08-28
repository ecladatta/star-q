import { getAdminSettings, updateAdminSettings } from '@/actions/admin/adminActions'
import { Page, PageHeader } from '@/components/page'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings()
  return (
    <Page>
      <PageHeader
        title="Instance settings"
      />
      <section className="max-w-2xl space-y-4">
        <SettingRow title="Signup" description="Allow unknown OAuth identities and local users to register." enabled={settings.signupEnabled} action={updateAdminSettings.bind(null, { signupEnabled: !settings.signupEnabled })} />
        <SettingRow title="Sign-in" description="Allow new user sessions. Existing sessions continue; administrators can always sign in." enabled={settings.signinEnabled} action={updateAdminSettings.bind(null, { signinEnabled: !settings.signinEnabled })} />
      </section>
    </Page>
  )
}

function SettingRow({ title, description, enabled, action }: { title: string, description: string, enabled: boolean, action: () => Promise<void> }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ServerActionForm action={action}><Button type="submit" variant={enabled ? 'outline' : 'default'}>{enabled ? 'Disable' : 'Enable'}</Button></ServerActionForm>
    </div>
  )
}
