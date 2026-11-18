import { AlertTriangle, BadgeCheck, CheckCircle2, CircleDashed } from 'lucide-react'
import type { SubmissionChecks } from '@/lib/api/types'
import { cn } from '@/lib/cn'

/** Shows a project as verified: its owner proved control of the GitHub repository. It says nothing about the work. */
export function VerifiedBadge({ className, by }: { className?: string; by?: string | null }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md border border-ink bg-signal px-1.5 py-0.5 text-xs font-medium text-ink', className)}
      title={by ? `The owner proved control of ${by.replace('github:', '')} on GitHub.` : 'The owner proved control of the project’s GitHub repository.'}
    >
      <BadgeCheck size={12} aria-hidden /> Verified
    </span>
  )
}

type Tone = 'ok' | 'warn' | 'neutral'

function Item({ tone, children }: { tone: Tone; children: string }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : CircleDashed
  return (
    <li className={cn('inline-flex items-center gap-1.5 text-xs', tone === 'warn' ? 'font-medium text-warn' : tone === 'ok' ? 'text-ink' : 'text-mute')}>
      <Icon size={13} aria-hidden className={tone === 'ok' ? 'text-ok' : undefined} />
      {children}
    </li>
  )
}

/**
 * The automatic checks BountyFi ran when the notes were attached. They save the creator reading, and they never
 * decide a winner: every one of them is something a person can still overrule.
 */
export function SubmissionChecksList({ checks }: { checks: SubmissionChecks }) {
  const worst = checks.links.some((l) => l.level === 'block') ? 'block' : checks.links.some((l) => l.level === 'warn') ? 'warn' : 'ok'
  return (
    <ul aria-label="Automatic checks" className="flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-paper px-3 py-2">
      <Item tone="ok">Notes match the on-chain hash</Item>
      <Item tone={checks.proofGiven ? 'ok' : 'neutral'}>{checks.proofGiven ? 'A link or file is attached' : 'No link attached'}</Item>
      {checks.words > 0 && <Item tone={checks.words >= 25 ? 'ok' : 'neutral'}>{`${checks.words} words`}</Item>}
      {checks.links.length > 0 && <Item tone={worst === 'ok' ? 'ok' : 'warn'}>{worst === 'ok' ? 'Links look normal' : (checks.links.find((l) => l.level !== 'ok')?.reasons[0] ?? 'A link needs care')}</Item>}
      {checks.duplicateOf && (
        <Item tone="warn">
          {checks.duplicateOf.sameWallet
            ? `Same text as this person's submission to bounty #${checks.duplicateOf.bountyId}`
            : `Very similar to another submission (bounty #${checks.duplicateOf.bountyId}, ${Math.round(checks.duplicateOf.score * 100)}% match)`}
        </Item>
      )}
    </ul>
  )
}
