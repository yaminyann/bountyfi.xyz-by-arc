import { Link } from 'react-router-dom'
import { Clock, FileText, FolderKanban, Layers, Lock, Users } from 'lucide-react'
import type { BountySummary } from '@/lib/api/types'
import { Status } from '@/lib/api/types'
import { useCategories } from '@/lib/api/ecosystem'
import { describeStructure } from '@/lib/prize'
import { formatUsdc, shortAddress } from '@/lib/money'
import { timeLeft } from '@/lib/time'
import { useNow } from '@/hooks/useNow'
import { PrizeLadder } from '@/components/bounty/PrizeLadder'
import { StatusBadge } from '@/components/bounty/StatusBadge'
import { CategoryChip, DifficultyBadge } from '@/components/ecosystem/badges'
import { Badge } from '@/components/ui/Feedback'
import { cn } from '@/lib/cn'

/** A bounty as a card: status and kind on top, the work in the middle, the prize and its split at the bottom. */
export function BountyCard({ bounty }: { bounty: BountySummary }) {
  const now = useNow()
  const categories = useCategories()
  const category = categories.data?.find((c) => c.slug === bounty.category)
  const live = bounty.status === Status.Funded && new Date(bounty.deadline).getTime() > now

  return (
    <li className="min-w-0">
      <Link
        to={`/bounty/${bounty.onchainId}`}
        className="group flex h-full flex-col rounded-lg border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-retro-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <StatusBadge status={bounty.status} deadline={bounty.deadline} now={now} />
          <CategoryChip slug={bounty.category} name={category?.name} icon={category?.icon} />
        </div>

        <h3 className="mt-4 line-clamp-2 min-h-[3.4rem] font-display text-lg font-semibold leading-snug group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{bounty.title}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-mute">{bounty.summary ?? ''}</p>

        <div className="mt-4 flex min-h-6 flex-wrap items-center gap-1.5">
          {bounty.difficulty && <DifficultyBadge difficulty={bounty.difficulty} />}
          {bounty.workMode === 'team' && (
            <Badge tone="info">
              <Users size={12} aria-hidden /> Team
            </Badge>
          )}
          {bounty.acceptsApplications && <Badge tone="info">Apply first</Badge>}
          {bounty.confidential && (
            <Badge>
              <Lock size={12} aria-hidden /> Encrypted
            </Badge>
          )}
          {bounty.milestoneCount > 0 && (
            <Badge>
              <Layers size={12} aria-hidden /> {bounty.milestoneCount}
            </Badge>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
            <div>
              <p className="num font-display text-2xl font-semibold leading-none">
                {formatUsdc(bounty.rewardAmount)}
                <span className="ml-1.5 text-sm font-medium text-mute">USDC</span>
              </p>
              <p className="mt-1.5 text-xs text-mute">{describeStructure(bounty.prizeShares)}</p>
            </div>
            <PrizeLadder shares={bounty.prizeShares} compact />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-mute">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <FolderKanban size={13} aria-hidden className="shrink-0" />
              <span className={cn('truncate', bounty.projectName ? 'font-medium text-ink' : 'num')}>{bounty.projectName ?? shortAddress(bounty.creatorWallet)}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-3">
              <span className={cn('inline-flex items-center gap-1.5', live && 'font-medium text-ink')}>
                <Clock size={13} aria-hidden />
                {timeLeft(bounty.deadline, now)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} aria-hidden />
                {bounty.submissionCount}
              </span>
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

export function BountyCardSkeleton() {
  return (
    <li aria-hidden className="rounded-lg border border-line bg-surface p-5">
      <div className="flex justify-between">
        <div className="h-5 w-24 animate-pulse rounded bg-ink/5" />
        <div className="h-5 w-20 animate-pulse rounded bg-ink/5" />
      </div>
      <div className="mt-4 h-6 w-4/5 animate-pulse rounded bg-ink/5" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-ink/5" />
      <div className="mt-8 h-14 w-full animate-pulse rounded bg-ink/5" />
    </li>
  )
}
