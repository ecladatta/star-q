import { signOutCurrentUser } from '@/actions/account/accountActions'
import { Button } from '@/components/ui/button'
import { HeaderShell } from './header-shell'

export function TempPasswordBar() {
  return (
    <HeaderShell>
      <form action={signOutCurrentUser} className="ml-auto">
        <Button type="submit" size="sm" variant="outline">Sign out</Button>
      </form>
    </HeaderShell>
  )
}
