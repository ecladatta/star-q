import { changeOwnPassword } from '@/actions/account/accountActions'
import { ServerActionForm } from '@/components/server-action-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PasswordFormProps = {
  hasPassword: boolean
}

export function PasswordForm({ hasPassword }: PasswordFormProps) {
  return (
    <ServerActionForm action={changeOwnPassword} className="max-w-lg space-y-4">
      {hasPassword && (
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
  )
}
