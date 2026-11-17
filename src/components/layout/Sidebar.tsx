import type { ReactNode } from 'react'
import { BookOpen, Bell, Compass, Home, LogOut, PlusCircle } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ConsoleShell, type ConsoleGroup } from '@/components/layout/ConsoleShell'
import { Avatar } from '@/components/ui/Address'
import { Button } from '@/components/ui/Button'
import { shortAddress } from '@/lib/money'
import { useAuth } from '@/contexts/AuthContext'
import { useIdentity } from '@/contexts/IdentityContext'
import { useUnreadCount, useWorkspace } from '@/lib/api/ecosystem'
import { cn } from '@/lib/cn'
import { ACTIVITY_NAV, DISCOVER_NAV, SETTINGS_NAV, WORKSPACE_NAV, profileNav, type NavItem } from '@/lib/nav'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2.5 text-xs font-medium text-mute">{title}</p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

function Item({ item, count, onNavigate }: { item: NavItem; count?: number; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-ink/[0.06] text-ink' : 'text-mute hover:bg-ink/[0.04] hover:text-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={16} aria-hidden className={cn(isActive ? 'text-ink' : 'text-mute group-hover:text-ink')} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {count !== undefined && count > 0 && <span className="num rounded-full bg-signal px-1.5 text-xs font-medium text-ink">{count}</span>}
          </>
        )}
      </NavLink>
    </li>
  )
}

/** The grouped navigation used by the workspace sidebar and the mobile menu. */
export function SidebarNav({ signedIn, onNavigate, includeDiscover = true }: { signedIn: boolean; onNavigate?: () => void; includeDiscover?: boolean }) {
  const { user } = useAuth()
  const id = useIdentity()
  const workspace = useWorkspace(id.status === 'ready')
  const unread = useUnreadCount(Boolean(user))

  const toReview = (workspace.data?.owner.submissionsToReview ?? 0) + (workspace.data?.owner.milestonesToReview ?? 0)
  const changes = workspace.data?.contributor.changesRequested ?? 0
  const profile = profileNav(id.linkedWallet)

  return (
    <nav aria-label="Workspace" className="space-y-5">
      {includeDiscover && (
        <Group title="Discover">
          {DISCOVER_NAV.map((item) => (
            <Item key={item.to} item={item} onNavigate={onNavigate} />
          ))}
          <Item item={{ to: '/docs', label: 'Docs', icon: BookOpen }} onNavigate={onNavigate} />
          <Item item={{ to: '/help', label: 'Wallet help', icon: DISCOVER_NAV[0].icon }} onNavigate={onNavigate} />
        </Group>
      )}
      {signedIn ? (
        <>
          <Group title="Workspace">
            {WORKSPACE_NAV.map((item) => (
              <Item
                key={item.to}
                item={item}
                count={item.to === '/dashboard/owner' ? toReview : item.to === '/workspace/contributions' ? changes : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </Group>
          <Group title="Activity">
            {ACTIVITY_NAV.map((item) => (
              <Item key={item.to} item={item} count={item.to === '/notifications' ? unread.data : item.to === '/submissions' ? toReview : undefined} onNavigate={onNavigate} />
            ))}
          </Group>
          <Group title="Profile">
            {profile && <Item item={profile} onNavigate={onNavigate} />}
            <Item item={SETTINGS_NAV} onNavigate={onNavigate} />
          </Group>
        </>
      ) : (
        <p className="rounded-md bg-ink/[0.04] px-3 py-3 text-sm text-mute">Sign in to see your dashboards, submissions and rewards.</p>
      )}
    </nav>
  )
}

/** Layout route for every signed-in page: the user's workspace as a full-page application, like the admin console. */
export function WorkspaceLayout() {
  const { user, signOut } = useAuth()
  const id = useIdentity()
  const { pathname } = useLocation()
  const workspace = useWorkspace(id.status === 'ready')
  const unread = useUnreadCount(Boolean(user))

  const toReview = (workspace.data?.owner.submissionsToReview ?? 0) + (workspace.data?.owner.milestonesToReview ?? 0)
  const changes = workspace.data?.contributor.changesRequested ?? 0
  const profile = profileNav(id.linkedWallet)

  const groups: ConsoleGroup[] = [
    {
      title: 'Workspace',
      items: WORKSPACE_NAV.map((item) => ({
        ...item,
        count: item.to === '/dashboard/owner' ? toReview : item.to === '/workspace/contributions' ? changes : undefined,
      })),
    },
    {
      title: 'Activity',
      items: ACTIVITY_NAV.map((item) => ({ ...item, count: item.to === '/notifications' ? unread.data : item.to === '/submissions' ? toReview : undefined })),
    },
    { title: 'Profile', items: [...(profile ? [profile] : []), SETTINGS_NAV] },
    { title: 'Bounties', items: [DISCOVER_NAV[0], { to: '/create', label: 'Post a bounty', icon: PlusCircle }] },
  ]

  const all = groups.flatMap((g) => g.items)
  const current = [...all].sort((a, b) => b.to.length - a.to.length).find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
  const needsSetup = Boolean(user) && id.status !== 'ready' && id.status !== 'loading'

  return (
    <ConsoleShell
      product="Workspace"
      home="/dashboard"
      root="Workspace"
      crumb={current?.label ?? 'Workspace'}
      groups={groups}
      sidebarFooter={
        user ? (
          <>
            <div className="flex items-center gap-3 rounded-md px-2 py-2">
              <Avatar name={user.displayName ?? user.email ?? id.address} src={user.photoURL} size={32} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user.displayName ?? user.email}</p>
                <p className="num truncate text-xs text-white/60">{id.linkedWallet ? shortAddress(id.linkedWallet) : 'No wallet linked'}</p>
              </div>
            </div>
            {needsSetup && (
              <Link to="/settings" className="mx-1 mb-1 mt-1 flex min-h-10 items-center justify-center rounded-md bg-signal px-3 text-sm font-semibold text-ink">
                Finish setup
              </Link>
            )}
            <Link to="/" className="mt-1 flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white">
              <Home size={18} strokeWidth={1.75} aria-hidden />
              Back to the site
            </Link>
            <button type="button" onClick={() => void signOut()} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white">
              <LogOut size={18} strokeWidth={1.75} aria-hidden />
              Sign out
            </button>
          </>
        ) : (
          <div className="space-y-2 p-1">
            <p className="px-2 text-xs text-white/60">Sign in to see your dashboards, submissions and rewards.</p>
            <Button className="w-full" variant="accent" onClick={() => void id.signInWithGoogle()}>
              Sign in with Google
            </Button>
            <Link to="/" className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white">
              <Home size={18} strokeWidth={1.75} aria-hidden />
              Back to the site
            </Link>
          </div>
        )
      }
      topRight={
        <>
          <Link
            to="/notifications"
            aria-label={(unread.data ?? 0) > 0 ? `Notifications, ${unread.data} unread` : 'Notifications'}
            className="relative grid size-10 place-items-center rounded-md text-mute hover:bg-ink/5 hover:text-ink"
          >
            <Bell size={18} aria-hidden />
            {(unread.data ?? 0) > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-signal-deep ring-2 ring-surface" />}
          </Link>
          <Link to="/explore" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium hover:border-ink/40">
            <Compass size={15} aria-hidden />
            <span className="hidden sm:inline">Explore bounties</span>
          </Link>
        </>
      }
    >
      <Outlet />
    </ConsoleShell>
  )
}
