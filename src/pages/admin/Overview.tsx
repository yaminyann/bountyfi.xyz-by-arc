import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, ClipboardCheck, Coins, Inbox, Link2, ShieldX, UserPlus, Users, Wallet, type LucideIcon } from 'lucide-react'
import { AddressChip } from '@/components/ui/Address'
import { ButtonLink } from '@/components/ui/Button'
import { Callout, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { FeeLedger } from '@/components/bounty/FeeLedger'
import { useAdminOverview } from '@/lib/api/queries'
import { Status } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import { formatUsdc } from '@/lib/money'

const STATUS_NAMES: Record<number, string> = {
  [Status.Open]: 'Awaiting funding',
  [Status.Funded]: 'Funded',
  [Status.Approved]: 'Winners picked',
  [Status.Claimed]: 'Paid out',
  [Status.Refunded]: 'Refunded',
  [Status.Cancelled]: 'Cancelled',
}

const STATUS_FILL: Record<number, string> = {
  [Status.Open]: 'bg-sky-deep',
  [Status.Funded]: 'bg-signal',
  [Status.Approved]: 'bg-ink/70',
  [Status.Claimed]: 'bg-ink',
  [Status.Refunded]: 'bg-mute/50',
  [Status.Cancelled]: 'bg-line',
}

function Kpi({ icon: Icon, label, value, unit, hint, to, attention }: { icon: LucideIcon; label: string; value: string; unit?: string; hint?: ReactNode; to?: string; attention?: boolean }) {
  const body = (
    <div className={cn('flex h-full flex-col justify-between gap-4 rounded-lg border bg-surface p-5 shadow-card transition-colors', attention ? 'border-ink' : 'border-line', to && 'hover:border-ink/50')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-mute">{label}</p>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-md border border-ink', attention ? 'bg-signal' : 'bg-sky')}>
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      <div>
        <p className="num font-display text-3xl font-semibold leading-none">
          {value}
          {unit && <span className="ml-1.5 text-sm font-medium text-mute">{unit}</span>}
        </p>
        {hint && <p className="mt-2 text-xs text-mute">{hint}</p>}
      </div>
    </div>
  )
  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-mute" />
      <div className="min-w-0">
        <p className="num font-display text-lg font-semibold leading-none">{value}</p>
        <p className="mt-1 truncate text-xs text-mute">{label}</p>
      </div>
    </div>
  )
}

function Card({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface shadow-card', className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {aside && <div className="num text-sm text-mute">{aside}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Bars({ title, points, format }: { title: string; points: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(...points.map((p) => p.value), 1)
  const total = points.reduce((s, p) => s + p.value, 0)
  return (
    <Card title={title} aside={`${format(total)} in 14 days`}>
      <div className="flex h-32 items-end gap-1.5" role="img" aria-label={`${title}, last 14 days: ${points.map((p) => `${p.label} ${format(p.value)}`).join(', ')}`}>
        {points.map((p, i) => (
          <div key={p.label} className="flex h-full flex-1 flex-col justify-end" title={`${p.label}: ${format(p.value)}`}>
            <div
              className={cn('w-full rounded-t-sm border border-ink', i === points.length - 1 ? 'bg-signal' : 'bg-ink')}
              style={{ height: `${Math.max((p.value / max) * 100, p.value > 0 ? 4 : 1)}%`, opacity: p.value === 0 ? 0.15 : 1 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-mute">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </Card>
  )
}

export default function Overview() {
  const q = useAdminOverview()
  if (q.isError) return <ErrorState title="The overview did not load" onRetry={() => void q.refetch()} />
  if (q.isPending) {
    return (
      <div className="space-y-6" aria-busy>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-16" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    )
  }
  const o = q.data
  const post = o.revenue.byKind.find((k) => k.kind === 0)
  const claim = o.revenue.byKind.find((k) => k.kind === 1)
  const short = (day: string) => day.slice(5)
  const totalBounties = o.chainStatus.reduce((n, s) => n + s.count, 0)

  return (
    <div className="space-y-6">
      {o.moderation.pending > 0 && (
        <Callout
          tone="warn"
          title={`${o.moderation.pending} ${o.moderation.pending === 1 ? 'bounty is' : 'bounties are'} waiting for review`}
          action={
            <ButtonLink to="/admin/review" variant="primary" size="sm">
              Open the review queue
            </ButtonLink>
          }
        >
          Nothing appears on the platform until you approve it.
        </Callout>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ClipboardCheck} label="Waiting for review" value={String(o.moderation.pending)} to="/admin/review" attention={o.moderation.pending > 0} hint="Funded and published by their creators" />
        <Kpi icon={BadgeCheck} label="Approved and public" value={String(o.moderation.approved)} to="/admin/bounties" hint={`${o.moderation.rejected} rejected, ${o.moderation.unpublished} not published`} />
        <Kpi icon={Users} label="Users" value={String(o.people.users)} to="/admin/users" hint={`${o.people.new7d} new in the last 7 days`} />
        <Kpi icon={Coins} label="Fees collected" value={formatUsdc(o.revenue.total, 2)} unit="USDC" to="/admin/revenue" hint={`${formatUsdc(o.revenue.week, 2)} USDC in the last 7 days`} />
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-card md:grid-cols-4 md:divide-y-0">
        <MiniStat icon={Inbox} label="Submissions" value={String(o.work.submissions)} />
        <MiniStat icon={Wallet} label="Linked wallets" value={String(o.people.wallets)} />
        <MiniStat icon={UserPlus} label="New users, 7 days" value={String(o.people.new7d)} />
        <MiniStat icon={ShieldX} label="Rejected bounties" value={String(o.moderation.rejected)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bars title="Fees collected per day" points={o.series.revenue.map((d) => ({ label: short(d.day), value: Number(d.amount) / 1e6 }))} format={(n) => `${n.toLocaleString('en-US', { maximumFractionDigits: 4 })} USDC`} />
        <Bars title="Bounties created per day" points={o.series.bounties.map((d) => ({ label: short(d.day), value: d.count }))} format={(n) => String(n)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card title="Platform revenue" aside="Counted from contract events">
          <div className="space-y-4">
            <FeeLedger
              lines={[
                { label: 'Post fees, 0.5%', value: `${formatUsdc(post?.total ?? 0, 4)} USDC` },
                { label: 'Claim fees, 5%', value: `${formatUsdc(claim?.total ?? 0, 4)} USDC` },
                { label: 'All time', value: `${formatUsdc(o.revenue.total, 4)} USDC`, total: true },
                { label: 'Last 24 hours', value: `${formatUsdc(o.revenue.day, 4)} USDC`, muted: true },
                { label: 'Last 7 days', value: `${formatUsdc(o.revenue.week, 4)} USDC`, muted: true },
                { label: 'Last 30 days', value: `${formatUsdc(o.revenue.month, 4)} USDC`, muted: true },
              ]}
            />
            <div className="space-y-1 border-t border-line pt-4 text-sm">
              <p className="flex items-center gap-2 text-mute">
                <Link2 size={14} aria-hidden /> Fee wallet
              </p>
              <AddressChip address={o.revenue.treasuryAddress} />
              <p className="num pt-1 font-semibold">{o.revenue.treasuryBalance !== null ? `${formatUsdc(o.revenue.treasuryBalance, 4)} USDC held` : 'Balance unavailable'}</p>
            </div>
          </div>
        </Card>

        <Card title="Bounties by on-chain state" aside={`${totalBounties} indexed`}>
          {o.chainStatus.length === 0 ? (
            <p className="py-6 text-center text-sm text-mute">No bounties have been indexed yet.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex h-3 overflow-hidden rounded-full border border-ink" role="img" aria-label={o.chainStatus.map((s) => `${STATUS_NAMES[s.status]} ${s.count}`).join(', ')}>
                {o.chainStatus.map((s) => (
                  <span key={s.status} className={STATUS_FILL[s.status]} style={{ width: `${(s.count / Math.max(totalBounties, 1)) * 100}%` }} />
                ))}
              </div>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Bounties grouped by on-chain state</caption>
                <thead>
                  <tr className="text-xs text-mute">
                    <th scope="col" className="pb-2 font-medium">
                      State
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Bounties
                    </th>
                    <th scope="col" className="pb-2 text-right font-medium">
                      Prize pools
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {o.chainStatus.map((s) => (
                    <tr key={s.status}>
                      <td className="py-2.5">
                        <span className="flex items-center gap-2">
                          <span aria-hidden className={cn('size-2.5 rounded-sm border border-ink', STATUS_FILL[s.status])} />
                          {STATUS_NAMES[s.status]}
                        </span>
                      </td>
                      <td className="num py-2.5 text-right">{s.count}</td>
                      <td className="num py-2.5 text-right">{formatUsdc(s.reward)} USDC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
