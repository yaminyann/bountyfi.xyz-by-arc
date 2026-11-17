import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  ClipboardCheck,
  Coins,
  ExternalLink as ExternalIcon,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Scale,
  ScrollText,
  Server,
  Tags,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Address'
import { Button } from '@/components/ui/Button'
import { Callout, EmptyState, Spinner } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminAccess, useAdminOverview } from '@/lib/api/queries'
import { cn } from '@/lib/cn'

interface Item {
  to: string
  label: string
  icon: LucideIcon
  title: string
  description: string
  end?: boolean
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Moderation',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, title: 'Overview', description: 'Platform health, revenue and what needs a decision.' },
      { to: '/admin/review', label: 'Review queue', icon: ClipboardCheck, title: 'Review queue', description: 'Funded bounties waiting for approval. Nothing is public until you approve it.' },
      { to: '/admin/bounties', label: 'All bounties', icon: ListChecks, title: 'All bounties', description: 'Every bounty indexed from the contract, with its review state. Earlier decisions can be changed here.' },
      { to: '/admin/submissions', label: 'Submissions', icon: Inbox, title: 'Submissions', description: 'Work submitted on-chain, with the status of its notes and checks.' },
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
      { to: '/admin/audit', label: 'Audit log', icon: ScrollText, title: 'Audit log', description: 'Every admin action, with who did it and when.' },
      { to: '/admin/system', label: 'System', icon: Server, title: 'System', description: 'Indexer position, services and the addresses the platform trusts.' },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.items)

function currentItem(pathname: string): Item {
  const exact = ALL.find((i) => i.to === pathname)
  if (exact) return exact
  return [...ALL].filter((i) => !i.end).find((i) => pathname.startsWith(i.to)) ?? ALL[0]
}

function Brand() {
  return (
    <Link to="/admin" className="flex items-center gap-2.5" aria-label="BountyFi admin home">
      <img src="/brand/mark.png" alt="" width={32} height={32} className="size-8 rounded-md" />
      <span className="font-display text-base font-semibold leading-none text-white">
        BountyFi
        <span className="mt-1 block text-[11px] font-medium text-white/60">Admin console</span>
      </span>
    </Link>
  )
}

function SideNav({ pending, onNavigate }: { pending: number; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-xs font-medium text-white/50">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={18} strokeWidth={1.75} aria-hidden className={isActive ? 'text-signal' : 'text-white/60 group-hover:text-white'} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.to === '/admin/review' && pending > 0 && <span className="num rounded-full bg-signal px-2 py-0.5 text-xs font-semibold text-ink">{pending}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center bg-paper px-4 py-10">{children}</div>
}

/** Gate for the whole console, and its full-page shell. Access is decided by the server from your verified Google email. */
export default function AdminLayout() {
  const { user, loading, signIn, signOut } = useAuth()
  const access = useAdminAccess()
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const drawer = openOn === pathname
  const closeRef = useRef<HTMLButtonElement>(null)
  const ready = Boolean(user) && access.isSuccess
  const overview = useAdminOverview(ready)

  useEffect(() => {
    if (!drawer) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOn(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

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

  const item = currentItem(pathname)
  const pending = overview.data?.moderation.pending ?? 0

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:border-2 focus:border-ink focus:bg-signal focus:px-3 focus:py-2 focus:text-sm focus:font-semibold">
        Skip to content
      </a>

      <aside className="on-ink sticky top-0 hidden h-dvh flex-col bg-ink lg:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SideNav pending={pending} />
        </div>
        <div className="border-t border-white/12 p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar name={user.displayName ?? user.email} src={user.photoURL} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.displayName ?? 'Admin'}</p>
              <p className="truncate text-xs text-white/60">{access.data?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setOpenOn(null)} />
          <div className="on-ink absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4">
              <Brand />
              <button ref={closeRef} type="button" aria-label="Close menu" className="grid size-11 place-items-center rounded-md text-white hover:bg-white/10" onClick={() => setOpenOn(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <SideNav pending={pending} onNavigate={() => setOpenOn(null)} />
            </div>
            <div className="border-t border-white/12 p-3">
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white"
              >
                <LogOut size={18} strokeWidth={1.75} aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              className="-ml-2 grid size-11 place-items-center rounded-md hover:bg-ink/5 lg:hidden"
              onClick={() => setOpenOn(pathname)}
            >
              <Menu size={20} aria-hidden />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-mute sm:inline">Admin</span>
              <span aria-hidden className="hidden text-line sm:inline">
                /
              </span>
              <span className="truncate font-medium">{item.label}</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {pending > 0 && (
              <Link to="/admin/review" className="num hidden min-h-9 items-center gap-2 rounded-md border border-ink bg-signal px-3 text-sm font-medium sm:inline-flex">
                {pending} to review
              </Link>
            )}
            <Link to="/" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium hover:border-ink/40">
              <ExternalIcon size={15} aria-hidden />
              <span className="hidden sm:inline">View site</span>
            </Link>
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="page-title">{item.title}</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-mute sm:text-base">{item.description}</p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
