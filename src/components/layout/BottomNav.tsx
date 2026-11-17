import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, Compass, FolderKanban, Menu, Plus, X } from 'lucide-react'
import { AccountPanel } from '@/components/layout/AccountPanel'
import { SidebarNav } from '@/components/layout/Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'

const ITEM =
  'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-ink/5'

/**
 * The phone navigation: four destinations and the one action the product exists for, posting a bounty.
 * "More" opens a sheet with the account steps and every other page, so nothing is hidden behind an unlabelled icon.
 * The bar is only shown below the width where the header carries the same links.
 */
export function BottomNav() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOn(null)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  const link = ({ isActive }: { isActive: boolean }) => cn(ITEM, isActive ? 'text-ink' : 'text-mute')

  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch px-2">
          <NavLink to="/explore" className={link}>
            {({ isActive }) => (
              <>
                <Compass size={20} aria-hidden strokeWidth={isActive ? 2.4 : 1.8} />
                Explore
              </>
            )}
          </NavLink>
          <NavLink to="/projects" end className={link}>
            {({ isActive }) => (
              <>
                <FolderKanban size={20} aria-hidden strokeWidth={isActive ? 2.4 : 1.8} />
                Projects
              </>
            )}
          </NavLink>
          <div className="flex flex-1 items-center justify-center">
            <NavLink
              to="/create"
              aria-label="Post a bounty"
              className="grid size-12 -translate-y-2 place-items-center rounded-md border border-ink bg-signal text-ink shadow-retro-sm transition-transform active:translate-x-px active:translate-y-0 active:shadow-none"
            >
              <Plus size={24} aria-hidden strokeWidth={2.4} />
            </NavLink>
          </div>
          <NavLink to="/docs" className={link}>
            {({ isActive }) => (
              <>
                <BookOpen size={20} aria-hidden strokeWidth={isActive ? 2.4 : 1.8} />
                Docs
              </>
            )}
          </NavLink>
          <button type="button" className={cn(ITEM, open ? 'text-ink' : 'text-mute')} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpenOn(open ? null : pathname)}>
            <Menu size={20} aria-hidden strokeWidth={1.8} />
            More
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={() => setOpenOn(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl border-t border-ink bg-surface px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 animate-sheet-in">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">Menu</span>
              <button ref={closeRef} type="button" aria-label="Close menu" className="grid size-11 place-items-center rounded-md hover:bg-ink/5" onClick={() => setOpenOn(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="space-y-6">
              <AccountPanel onNavigate={() => setOpenOn(null)} />
              <SidebarNav signedIn={Boolean(user)} onNavigate={() => setOpenOn(null)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
