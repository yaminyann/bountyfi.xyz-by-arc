import { type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Activity, Ban, ClipboardCheck, Coins, Flag, ExternalLink as ExternalIcon, FolderKanban, Inbox, LayoutDashboard, ListChecks, LogOut, Scale, ScrollText, Server, Tags, Users } from 'lucide-react'
import { ConsoleShell, type ConsoleGroup, type ConsoleItem } from '@/components/layout/ConsoleShell'
import { Avatar } from '@/components/ui/Address'
import { Button } from '@/components/ui/Button'
import { Callout, EmptyState, Spinner } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminAccess, useAdminOverview } from '@/lib/api/queries'

interface Page extends ConsoleItem {
  title: string
  description: string
}

const GROUPS: { title: string; items: Page[] }[] = [
  {
    title: 'Moderation',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, title: 'Overview', description: 'Platform health, revenue and what needs a decision.' },
      { to: '/admin/review', label: 'Review queue', icon: ClipboardCheck, title: 'Review queue', description: 'Funded bounties waiting for approval. Nothing is public until you approve it.' },
      { to: '/admin/bounties', label: 'All bounties', icon: ListChecks, title: 'All bounties', description: 'Every bounty indexed from the contract, with its review state. Earlier decisions can be changed here.' },
      { to: '/admin/submissions', label: 'Submissions', icon: Inbox, title: 'Submissions', description: 'Work submitted on-chain, with the status of its notes and checks.' },
      { to: '/admin/reports', label: 'Reports', icon: Flag, title: 'Reports', description: 'What people flagged as scams, spam, phishing or copied work. The most reported come first.' },
      { to: '/admin/disputes', label: 'Disputes', icon: Scale, title: 'Disputes', description: 'Mediation threads. Outcomes are recorded and never move USDC.' },
    ],
  },
  {
    title: 'Directory',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users, title: 'Users', description: 'Accounts with their linked wallets.' },
      { to: '/admin/projects', label: 'Projects', icon: FolderKanban, title: 'Projects', description: 'Public project workspaces and their status.' },
      { to: '/admin/categories', label: 'Categories', icon: Tags, title: 'Categories', description: 'The kinds of work contributors can post and browse.' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/admin/revenue', label: 'Revenue', icon: Coins, title: 'Revenue', description: 'Platform fees counted from contract events.' },
      { to: '/admin/activity', label: 'Chain activity', icon: Activity, title: 'Chain activity', description: 'Contract events as the indexer recorded them.' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { to: '/admin/domains', label: 'Blocked links', icon: Ban, title: 'Blocked links', description: 'Domains that new bounties and submissions cannot link to.' },
      { to: '/admin/audit', label: 'Audit log', icon: ScrollText, title: 'Audit log', description: 'Every admin action, with who did it and when.' },
      { to: '/admin/system', label: 'System', icon: Server, title: 'System', description: 'Indexer position, services and the addresses the platform trusts.' },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.items)

function currentPage(pathname: string): Page {
  const exact = ALL.find((i) => i.to === pathname)
  if (exact) return exact
  return [...ALL].filter((i) => !i.end).find((i) => pathname.startsWith(i.to)) ?? ALL[0]
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-paper px-4 py-10">{children}</div>
}

/** Gate for the whole console, and its full-page shell. Access is decided by the server from your verified Google email. */
export default function AdminLayout() {
  const { user, loading, signIn, signOut } = useAuth()
  const access = useAdminAccess()
  const { pathname } = useLocation()
  const overview = useAdminOverview(Boolean(user) && access.isSuccess)

  if (loading || (user && access.isPending)) {
    return (
      <Frame>
        <Spinner size={28} />
      </Frame>
    )
  }

  if (!user) {
    return (
      <Frame>
        <div className="w-full max-w-lg rounded-lg border border-ink bg-surface p-8 shadow-retro">
          <EmptyState
            title="Sign in to open the admin console"
            action={
              <Button variant="primary" onClick={() => void signIn()}>
                Sign in with Google
              </Button>
            }
          >
            Admin access is tied to your Google account. There is no separate password.
          </EmptyState>
        </div>
      </Frame>
    )
  }

  if (access.isError) {
    const forbidden = (access.error as { status?: number }).status === 403
    return (
      <Frame>
        <div className="w-full max-w-lg space-y-4">
          <Callout tone="danger" title={forbidden ? 'This account is not an admin' : 'The console could not be opened'}>
            {forbidden ? `${user.email ?? 'This account'} is not on the admin list. Sign in with an admin account.` : 'The server did not respond. Try again in a moment.'}
          </Callout>
          <div className="flex gap-2">
            <Button onClick={() => void signOut()}>Sign out</Button>
            {!forbidden && (
              <Button variant="primary" onClick={() => void access.refetch()}>
                Try again
              </Button>
            )}
          </div>
        </div>
      </Frame>
    )
  }

  const page = currentPage(pathname)
  const pending = overview.data?.moderation.pending ?? 0
  const groups: ConsoleGroup[] = GROUPS.map((g) => ({ title: g.title, items: g.items.map((i) => ({ ...i, count: i.to === '/admin/review' ? pending : undefined })) }))

  return (
    <ConsoleShell
      product="Admin console"
      home="/admin"
      root="Admin"
      crumb={page.label}
      groups={groups}
      title={page.title}
      description={page.description}
      sidebarFooter={
        <>
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar name={user.displayName ?? user.email} src={user.photoURL} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.displayName ?? 'Admin'}</p>
              <p className="truncate text-xs text-white/60">{access.data?.email}</p>
            </div>
          </div>
          <button type="button" onClick={() => void signOut()} className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white">
            <LogOut size={18} strokeWidth={1.75} aria-hidden />
            Sign out
          </button>
        </>
      }
      topRight={
        <>
          {pending > 0 && (
            <Link to="/admin/review" className="num hidden min-h-9 items-center gap-2 rounded-md border border-ink bg-signal px-3 text-sm font-medium sm:inline-flex">
              {pending} to review
            </Link>
          )}
          <Link to="/" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium hover:border-ink/40">
            <ExternalIcon size={15} aria-hidden />
            <span className="hidden sm:inline">View site</span>
          </Link>
        </>
      }
    >
      <Outlet />
    </ConsoleShell>
  )
}
