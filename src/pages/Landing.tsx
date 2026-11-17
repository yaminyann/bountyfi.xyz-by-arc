import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { PrizeCalculator } from '@/components/bounty/PrizeCalculator'
import { PrizeLadder } from '@/components/bounty/PrizeLadder'
import { StatusBadge } from '@/components/bounty/StatusBadge'
import { BoardScene, ClaimScene, FinalityScene, FundScene, HeroScene, PickScene, ReceiptScene, SubmitScene } from '@/components/art/Scenes'
import { Reveal } from '@/components/motion/Reveal'
import { useCategories } from '@/lib/api/ecosystem'
import { useBounties, usePublicStats } from '@/lib/api/queries'
import { categoryIcon } from '@/lib/nav'
import { formatUsdc } from '@/lib/money'
import { timeLeft } from '@/lib/time'

function OpenNow() {
  const query = useBounties({ state: 'open', sort: 'newest', limit: 4 })
  const items = query.data?.items ?? []

  return (
    <section aria-labelledby="open-now" className="overflow-hidden rounded-lg border border-ink bg-surface shadow-retro">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
        <h2 id="open-now" className="font-display text-base font-semibold">
          Open for work right now
        </h2>
        <Link to="/explore" className="text-sm font-medium underline underline-offset-2">
          See all
        </Link>
      </div>

      {query.isPending ? (
        <ul aria-hidden className="divide-y divide-line">
          {[0, 1, 2].map((i) => (
            <li key={i} className="space-y-2 px-5 py-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <div className="p-4">
          <ErrorState title="Bounties did not load" message="The list is temporarily unavailable." onRetry={() => void query.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No bounties are open yet"
            action={
              <ButtonLink to="/create" variant="primary">
                Post the first bounty
              </ButtonLink>
            }
          >
            New bounties appear here once an admin has reviewed them.
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((b) => (
            <li key={b.id}>
              <Link to={`/bounty/${b.onchainId}`} className="grid gap-3 px-5 py-4 hover:bg-ink/[0.02] sm:grid-cols-[1fr_auto]">
                <div className="min-w-0 space-y-1.5">
                  <StatusBadge status={b.status} deadline={b.deadline} />
                  <p className="line-clamp-2 font-display font-semibold leading-snug">{b.title}</p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-mute">
                    {b.projectName && <span className="font-medium text-ink">{b.projectName}</span>}
                    <span>{timeLeft(b.deadline)}</span>
                    <span>
                      {b.submissionCount} {b.submissionCount === 1 ? 'submission' : 'submissions'}
                    </span>
                  </p>
                </div>
                <div className="flex items-start gap-4 sm:flex-col sm:items-end">
                  <p className="num font-display text-xl font-semibold">{formatUsdc(b.rewardAmount)} USDC</p>
                  <PrizeLadder shares={b.prizeShares} compact />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Platform totals. A figure is shown only when it is above zero, so nothing here is ever a placeholder. */
function Totals() {
  const stats = usePublicStats()
  const s = stats.data
  if (!s) return null
  const cells = [
    s.liveBounties > 0 && { label: 'Bounties live', value: String(s.liveBounties) },
    BigInt(s.totalPosted) > 0n && { label: 'USDC posted in prizes', value: formatUsdc(s.totalPosted) },
    BigInt(s.totalPaidOut) > 0n && { label: 'USDC paid to winners', value: formatUsdc(s.totalPaidOut) },
    s.builders > 0 && { label: 'Contributors who submitted', value: String(s.builders) },
  ].filter(Boolean) as { label: string; value: string }[]
  if (cells.length === 0) return null

  return (
    <dl className="grid divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface md:grid-flow-col md:auto-cols-fr md:divide-x md:divide-y-0">
      {cells.map((c) => (
        <div key={c.label} className="px-5 py-4">
          <dd className="num font-display text-2xl font-semibold">{c.value}</dd>
          <dt className="text-xs text-mute">{c.label}</dt>
        </div>
      ))}
    </dl>
  )
}

function Categories() {
  const query = useCategories()
  if (!query.data || query.data.length === 0) return null
  return (
    <section aria-labelledby="kinds" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="kinds" className="page-title">
            Work of every kind
          </h2>
          <p className="mt-1 max-w-xl text-mute">Anything with a clear outcome can carry a reward, not only code.</p>
        </div>
        <Link to="/categories" className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2">
          All categories <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {query.data.map((c) => {
          const Icon = categoryIcon(c.icon)
          return (
            <li key={c.slug} className="bg-surface">
              <Link to={`/explore?category=${c.slug}`} className="flex h-full gap-3 p-4 transition-colors hover:bg-ink/[0.02]">
                <Icon size={18} aria-hidden className="mt-0.5 shrink-0 text-mute" />
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block truncate text-sm text-mute">{c.examples.slice(0, 3).join(', ')}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const MODULES = [
  { to: '/projects', title: 'Project workspaces', body: 'A public page per project with its open bounties and reward history.' },
  { to: '/explore', title: 'Milestones', body: 'Split large work into reviewable pieces with planned rewards.' },
  { to: '/workspace/teams', title: 'Team bounties', body: 'Assign roles and agree the split. The team settles between themselves.' },
  { to: '/workspace/projects', title: 'Recurring programs', body: 'Publish each weekly or monthly cycle as its own funded bounty.' },
  { to: '/submissions', title: 'Reviews', body: 'Comment, request revisions, approve or reject, with full history.' },
]

const STEPS: { title: string; body: string; scene: ReactNode }[] = [
  { title: 'Fund', body: 'The creator locks the prize in the contract. A 0.5% fee goes to the treasury.', scene: <FundScene /> },
  { title: 'Submit', body: 'Contributors send work before the deadline. Each submission is recorded on-chain as a hash of its text.', scene: <SubmitScene /> },
  { title: 'Pick', body: 'The creator picks winners once. Places fill from the top, and unused places return to the creator.', scene: <PickScene /> },
  { title: 'Claim', body: 'Each winner claims within 7 days of approval and keeps the prize minus the 5% claim fee. Anything unclaimed can go back to the creator.', scene: <ClaimScene /> },
]

/** The four stages of a bounty. On wide screens the artwork stays in place and changes as each stage scrolls past. */
function Story() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step))
        }
      },
      { rootMargin: '-40% 0px -40% 0px' },
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section aria-labelledby="story" className="grid gap-x-16 gap-y-8 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <Reveal as="h2" className="page-title max-w-2xl">
          <span id="story">One prize, four moments.</span>
        </Reveal>
      </div>
      <ol className="space-y-12 lg:space-y-0">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            ref={(el) => {
              refs.current[i] = el
            }}
            data-step={i}
            className="lg:flex lg:min-h-[58vh] lg:items-center"
          >
            <div className="space-y-5">
              <div className="overflow-hidden rounded-lg border border-ink shadow-retro lg:hidden">{step.scene}</div>
              <Reveal className="grid grid-cols-[3rem_1fr] items-baseline gap-3">
                <span className="pixel-label pt-1 text-mute">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-2xl font-semibold">{step.title}</h3>
                  <p className="mt-1.5 max-w-md text-mute">{step.body}</p>
                </div>
              </Reveal>
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-24 overflow-hidden rounded-lg border border-ink shadow-retro">
          <div key={active}>{STEPS[active].scene}</div>
        </div>
      </div>
    </section>
  )
}

function Hero() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
      <div className="space-y-6">
        <Reveal as="h1" className="font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.25rem]">
          Lock the prize. Pay the winners.
        </Reveal>
        <Reveal delay={120} as="p" className="max-w-md text-lg text-mute">
          A USDC prize waits in a smart contract until the creator picks winners. Winners claim straight from the contract.
        </Reveal>
        <Reveal delay={240} className="flex flex-wrap gap-3 pt-1">
          <ButtonLink to="/explore" variant="primary" size="lg">
            Browse open bounties
          </ButtonLink>
          <ButtonLink to="/create" size="lg">
            Post a bounty
          </ButtonLink>
        </Reveal>
        <Reveal delay={360} as="p" className="max-w-sm text-sm text-mute">
          0.5% is added when you fund. 5% is taken from each winner's payout. Nothing else.
        </Reveal>
      </div>
      <Reveal delay={200} className="overflow-hidden rounded-lg border border-ink shadow-retro">
        <HeroScene />
      </Reveal>
    </section>
  )
}

export default function Landing() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <Hero />
      <Totals />
      <Story />

      <OpenNow />

      <section aria-labelledby="calc" className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="overflow-hidden rounded-lg border border-ink shadow-retro">
          <ReceiptScene />
        </Reveal>
        <div className="space-y-6">
          <Reveal as="h2" className="page-title">
            <span id="calc">Know the payout before you post.</span>
          </Reveal>
          <Reveal delay={120} as="p" className="max-w-md text-mute">
            Every deduction is a fixed rate in the contract, so these numbers are the numbers on-chain. The receipt shows a 100 USDC example.
          </Reveal>
          <Reveal delay={200} className="rounded-lg border border-line bg-surface p-5 sm:p-6">
            <PrizeCalculator />
          </Reveal>
        </div>
      </section>

      <Categories />

      <section aria-labelledby="modules" className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="space-y-6">
          <Reveal as="h2" className="page-title">
            <span id="modules">More than one-off bounties.</span>
          </Reveal>
          <ul className="divide-y divide-line border-y border-line">
            {MODULES.map((m, i) => (
              <Reveal as="li" key={m.title} delay={i * 70}>
                <Link to={m.to} className="group grid gap-1 py-4 transition-colors hover:bg-surface/60 sm:grid-cols-[11rem_1fr] sm:gap-6 sm:px-2">
                  <span className="font-display font-semibold group-hover:underline group-hover:underline-offset-4">{m.title}</span>
                  <span className="text-sm text-mute">{m.body}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
          <p className="text-sm text-mute">Milestones, teams and programs are records. USDC moves only through the escrow.</p>
        </div>
        <Reveal delay={150} className="overflow-hidden rounded-lg border border-ink shadow-retro">
          <BoardScene />
        </Reveal>
      </section>

      <section aria-labelledby="arc" className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="overflow-hidden rounded-lg border border-ink shadow-retro">
          <FinalityScene />
        </Reveal>
        <div className="space-y-5">
          <Reveal as="h2" className="page-title">
            <span id="arc">Built on Arc.</span>
          </Reveal>
          <Reveal delay={120} as="p" className="max-w-md text-mute">
            Arc Network finalizes transactions in under a second and takes gas in USDC, so a funding or a claim is one transaction you can read on the explorer. BountyFi runs on Arc Testnet today.
          </Reveal>
          <Reveal delay={200} className="flex flex-wrap gap-3">
            <ButtonLink to="/docs#arc" variant="secondary">
              Read how BountyFi uses Arc
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <Reveal as="section" className="on-ink flex flex-col items-start justify-between gap-6 rounded-lg border border-ink bg-ink p-8 text-white sm:flex-row sm:items-center sm:p-10">
        <h2 className="max-w-md font-display text-3xl font-semibold leading-tight sm:text-4xl">Fund the first bounty, or claim the first prize.</h2>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/create" variant="accent" size="lg">
            Post a bounty
          </ButtonLink>
          <ButtonLink to="/docs" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            Read the docs
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  )
}
