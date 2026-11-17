import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ConsoleItem {
  to: string
  label: string
  icon: ComponentType<LucideProps>
  end?: boolean
  /** Shown as a yellow pill when above zero. */
  count?: number
}

export interface ConsoleGroup {
  title: string
  items: ConsoleItem[]
}

interface ConsoleShellProps {
  /** Small label under the brand, for example "Admin console" or "Workspace". */
  product: string
  home: string
  groups: ConsoleGroup[]
  /** The current page's name for the breadcrumb. */
  crumb: string
  root: string
  /** Pinned at the bottom of the sidebar: who is signed in and how to leave. */
  sidebarFooter: ReactNode
  /** Right side of the top bar. */
  topRight: ReactNode
  title?: string
  description?: string
  children: ReactNode
}

function Brand({ product, home }: { product: string; home: string }) {
  return (
    <Link to={home} className="flex items-center gap-2.5" aria-label={`BountyFi ${product}`}>
      <img src="/brand/mark.png" alt="" width={32} height={32} className="size-8 rounded-md" />
      <span className="font-display text-base font-semibold leading-none text-white">
        BountyFi
        <span className="mt-1 block text-[11px] font-medium text-white/60">{product}</span>
      </span>
    </Link>
  )
}

function SideNav({ groups, onNavigate }: { groups: ConsoleGroup[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Sections" className="space-y-6">
      {groups.map((g) => (
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
                      {item.count !== undefined && item.count > 0 && <span className="num rounded-full bg-signal px-2 py-0.5 text-xs font-semibold text-ink">{item.count}</span>}
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

/**
 * The full-page application frame used by the admin console and the user workspace: a dark sidebar with grouped
 * navigation, a top bar with a breadcrumb, and a content column. Below 1024px the sidebar becomes a drawer.
 */
export function ConsoleShell({ product, home, groups, crumb, root, sidebarFooter, topRight, title, description, children }: ConsoleShellProps) {
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const drawer = openOn === pathname
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!drawer) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOn(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a href="#console-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:border-2 focus:border-ink focus:bg-signal focus:px-3 focus:py-2 focus:text-sm focus:font-semibold">
        Skip to content
      </a>

      <aside className="on-ink sticky top-0 hidden h-dvh flex-col bg-ink lg:flex">
        <div className="px-5 py-5">
          <Brand product={product} home={home} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SideNav groups={groups} />
        </div>
        <div className="border-t border-white/12 p-3">{sidebarFooter}</div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={`${product} menu`}>
          <button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setOpenOn(null)} />
          <div className="on-ink absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4">
              <Brand product={product} home={home} />
              <button ref={closeRef} type="button" aria-label="Close menu" className="grid size-11 place-items-center rounded-md text-white hover:bg-white/10" onClick={() => setOpenOn(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <SideNav groups={groups} onNavigate={() => setOpenOn(null)} />
            </div>
            <div className="border-t border-white/12 p-3">{sidebarFooter}</div>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" aria-label="Open menu" aria-haspopup="dialog" className="-ml-2 grid size-11 place-items-center rounded-md hover:bg-ink/5 lg:hidden" onClick={() => setOpenOn(pathname)}>
              <Menu size={20} aria-hidden />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-mute sm:inline">{root}</span>
              <span aria-hidden className="hidden text-line sm:inline">
                /
              </span>
              <span className="truncate font-medium">{crumb}</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">{topRight}</div>
        </header>

        <main id="console-main" className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {title && (
            <div className="mb-6 sm:mb-8">
              <h1 className="page-title">{title}</h1>
              {description && <p className="mt-1.5 max-w-2xl text-sm text-mute sm:text-base">{description}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
