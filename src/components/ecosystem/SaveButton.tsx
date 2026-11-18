import { Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { errorMessage } from '@/lib/api/client'
import { useSavedIds, useToggleSaved } from '@/lib/api/safety'
import { cn } from '@/lib/cn'

/** Saves a bounty for later. It sits on cards, so it stops the click from opening the card. */
export function SaveButton({ onchainId, className, label = false }: { onchainId: number; className?: string; label?: boolean }) {
  const { user, signIn } = useAuth()
  const ids = useSavedIds()
  const toggle = useToggleSaved()
  const saved = ids.data?.includes(onchainId) ?? false

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved bounties' : 'Save this bounty'}
      title={saved ? 'Saved. Click to remove.' : 'Save for later'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!user) return void signIn()
        toggle.mutate({ onchainId, saved: !saved }, { onError: (err) => toast.error(errorMessage(err)) })
      }}
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-ink/5',
        saved ? 'text-ink' : 'text-mute hover:text-ink',
        className,
      )}
    >
      <Bookmark size={15} aria-hidden fill={saved ? 'currentColor' : 'none'} />
      {label && (saved ? 'Saved' : 'Save')}
    </button>
  )
}
