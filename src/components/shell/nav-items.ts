import type { LucideIcon } from 'lucide-react'
import { BarChart3, Database, FileText, Globe, Inbox, ScrollText, Settings, Shield, UserRound, Users } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
  exact?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export function isActive(pathname: string, item: Pick<NavItem, 'href' | 'exact'>): boolean {
  const { href, exact } = item
  if (href === '/')
    return pathname === '/'
  if (exact)
    return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function topNav({ isAdmin, invitationCount }: { isAdmin: boolean, invitationCount: number }): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Corpora', icon: Database },
    { href: '/explore', label: 'Explore', icon: Globe },
    { href: '/teams', label: 'Teams', icon: Users },
    { href: '/invitations', label: 'Invitations', icon: Inbox, badge: invitationCount },
  ]
  if (isAdmin) {
    items.push({ href: '/admin', label: 'Admin', icon: Shield })
  }
  return items
}

export function adminNav(): NavItem[] {
  return [
    { href: '/admin', label: 'Overview', icon: Shield, exact: true },
    { href: '/admin/users', label: 'Users', icon: UserRound },
    { href: '/admin/teams', label: 'Teams', icon: Users },
    { href: '/admin/corpora', label: 'Corpora', icon: Database },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
    { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
  ]
}

export function corpusNav(corpusId: string, permissions: { canManage: boolean, canEdit: boolean }, documentCount: number): NavItem[] {
  const items: NavItem[] = [
    { href: `/corpus/${corpusId}`, label: `Documents (${documentCount})`, icon: FileText, exact: true },
  ]
  if (permissions.canManage) {
    items.push({ href: `/corpus/${corpusId}/access`, label: 'Access', icon: Users })
  }
  items.push({ href: `/corpus/${corpusId}/analytics`, label: 'Analytics', icon: BarChart3 })
  if (permissions.canEdit) {
    items.push({ href: `/corpus/${corpusId}/settings`, label: 'Settings', icon: Settings, exact: true })
  }
  return items
}

export function buildNav({ isAdmin, invitationCount }: { isAdmin: boolean, invitationCount: number }): NavGroup[] {
  const groups: NavGroup[] = [{
    label: 'Workspace',
    items: topNav({ isAdmin: false, invitationCount }),
  }]
  if (isAdmin) {
    groups.push({
      label: 'Administration',
      items: adminNav(),
    })
  }
  return groups
}
