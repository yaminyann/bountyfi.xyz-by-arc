import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Braces,
  Check,
  ChevronDown,
  Coins,
  Database,
  FileCheck2,
  GitPullRequest,
  Hash,
  KeyRound,
  Lock,
  ScanSearch,
  Terminal,
  Timer,
  Trophy,
  Webhook,
  BarChart3,
  Briefcase,
  Building2,
  Landmark,
  Megaphone,
  Palette,
  PenLine,
  ShieldCheck,
  Store,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { PrizeLadder } from '@/components/bounty/PrizeLadder'
import { StatusBadge } from '@/components/bounty/StatusBadge'
import { BoardScene, ClaimScene, FinalityScene, FundScene, HeroScene, PickScene, SubmitScene } from '@/components/art/Scenes'
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
          All {query.data.length} categories <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {query.data.slice(0, 9).map((c) => {
          const Icon = categoryIcon(c.icon)
          return (
            <li key={c.slug} className="min-w-0 bg-surface">
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

const POSTERS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: User, title: 'Open-source maintainers', body: 'Pay for the issue nobody has time to fix.' },
  { icon: Building2, title: 'Startups and studios', body: 'Buy a feature, a design or an integration without a contract.' },
  { icon: Landmark, title: 'DAOs, foundations and ecosystem funds', body: 'Run grants and programs as funded, reviewable tasks.' },
  { icon: Store, title: 'Exchanges, wallets and protocols', body: 'Crowd-source audits, listings research and localisation.' },
  { icon: Megaphone, title: 'Communities and creators', body: 'Commission content, translations and events.' },
  { icon: Briefcase, title: 'Agencies and consultancies', body: 'Hand off overflow work with the payment already locked.' },
]

const SOLVERS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Braces, title: 'Developers', body: 'Contracts, apps, tooling and bug fixes.' },
  { icon: ShieldCheck, title: 'Security researchers and auditors', body: 'Reports can be encrypted to the creator.' },
  { icon: Palette, title: 'Designers and video makers', body: 'Interfaces, brands, explainers and clips.' },
  { icon: PenLine, title: 'Writers and translators', body: 'Docs, articles, threads and localisation.' },
  { icon: BarChart3, title: 'Analysts and researchers', body: 'Dashboards, on-chain analysis and market work.' },
  { icon: Users, title: 'Community builders and moderators', body: 'Support, onboarding, quests and events.' },
]

const CHECKS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Hash, title: 'Text locked by hash', body: 'Bounty and submission text must match a hash recorded on-chain, so nobody can edit it afterwards.' },
  { icon: Trophy, title: 'Ranked prize places', body: 'One winner, an equal split or up to ten ranked places. Unused places return to the creator.' },
  { icon: GitPullRequest, title: 'Pull request checks', body: 'A linked GitHub pull request shows its state and author next to the submission.' },
  { icon: KeyRound, title: 'Encrypted reports', body: 'Security reports are encrypted in the browser to the creator. The server stores ciphertext only.' },
  { icon: Bell, title: 'Alerts', body: 'Save a search and get told when a match goes live, in the app or in a chat channel.' },
  { icon: BadgeCheck, title: 'README badge', body: 'A live badge with a project’s open bounties and the USDC it has paid.' },
]

const COMPARE: [string, string][] = [
  ['Prize, deadline and status', 'Listing details such as category and skills'],
  ['Winners and claims', 'Milestones and review threads'],
  ['Fees paid to the treasury', 'Team roles and applications'],
  ['Submission hashes', 'Profile text and notes'],
]

const FAQ: [string, string][] = [
  ['Does BountyFi hold my money?', 'No. The prize sits in the contract, which has no owner or admin key. BountyFi cannot move, freeze or redirect it.'],
  ['What if the creator never picks a winner?', 'After the deadline and a 7 day review period, the creator can take the prize back. Check a creator’s record before you spend time on their bounty.'],
  ['Can a team win together?', 'The contract pays one wallet per place. A team picks one wallet and agrees the split between themselves, which the team panel records.'],
  ['What does an admin do?', 'An admin approves a funded bounty before it is listed. Admins cannot change a prize, pick winners or touch the contract.'],
  ['Is this on mainnet?', 'No. BountyFi runs on Arc Testnet, where USDC has no real value. The contract has not had an independent audit.'],
  ['Why do I need Google and a wallet?', 'Google proves who you are and the wallet is where money goes. You link them once by signing a free message that sends no transaction.'],
]

/** Section heading used by every block of the page, so titles share one size, one measure and one spacing. */
function SectionHead({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="space-y-3">
      <Reveal as="h2" className="page-title">
        <span id={id}>{title}</span>
      </Reveal>
      {children && (
        <Reveal delay={100} as="p" className="max-w-md text-mute">
          {children}
        </Reveal>
      )}
    </div>
  )
}

/** The icon tile used for every feature row: one size, one outline, one stroke weight. */
function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-md border border-ink bg-sky text-ink">
      <Icon size={20} strokeWidth={1.75} aria-hidden />
    </span>
  )
}

function ArtFrame({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} className="overflow-hidden rounded-lg border border-ink shadow-retro">
      {children}
    </Reveal>
  )
}

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
        <SectionHead id="story" title="One prize, four moments." />
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
            <div className="w-full space-y-5">
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
    <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
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
          <ButtonLink to="/docs" size="lg">
            How it works
          </ButtonLink>
        </Reveal>
        <Reveal delay={360} as="p" className="max-w-sm text-sm text-mute">
          0.5% is added when you fund. 5% is taken from each winner's payout. Nothing else.
        </Reveal>
      </div>
      <ArtFrame delay={200}>
        <HeroScene />
      </ArtFrame>
    </section>
  )
}

function AudiencePanel({
  icon,
  role,
  title,
  points,
  cta,
  to,
  featured = false,
}: {
  icon: LucideIcon
  role: string
  title: string
  points: string[]
  cta: string
  to: string
  featured?: boolean
}) {
  return (
    <Reveal className={featured ? 'flex flex-col rounded-lg border border-ink bg-surface p-6 shadow-retro sm:p-8' : 'flex flex-col rounded-lg border border-line bg-surface p-6 sm:p-8'}>
      <div className="flex items-center gap-3">
        <IconTile icon={icon} />
        <span className="pixel-label text-mute">{role.toUpperCase()}</span>
      </div>
      <h3 className="mt-5 font-display text-2xl font-semibold leading-snug">{title}</h3>
      <ul className="mt-5 space-y-3">
        {points.map((p) => (
          <li key={p} className="grid grid-cols-[1.25rem_1fr] gap-3 text-sm">
            <Check size={18} strokeWidth={2.25} aria-hidden className="mt-0.5 text-ink" />
            <span className="text-ink/90">{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <ButtonLink to={to} variant={featured ? 'accent' : 'secondary'} size="lg">
          {cta}
        </ButtonLink>
      </div>
    </Reveal>
  )
}

function Faq() {
  return (
    <section aria-labelledby="faq" className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
      <div className="space-y-5">
        <SectionHead id="faq" title="Questions people ask first.">
          The full answers are in the docs.
        </SectionHead>
        <Reveal delay={150}>
          <ButtonLink to="/docs#faq" variant="secondary">
            Read the docs
          </ButtonLink>
        </Reveal>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {FAQ.map(([q, a], i) => (
          <Reveal as="li" key={q} delay={i * 60}>
            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display font-semibold marker:hidden">
                {q}
                <ChevronDown size={18} aria-hidden className="shrink-0 text-mute transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="max-w-[60ch] pb-5 text-sm text-mute">{a}</p>
            </details>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

export default function Landing() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <Hero />
      <Totals />

      <section aria-labelledby="who" className="space-y-8">
        <SectionHead id="who" title="Two ways in." />
        <div className="grid gap-6 md:grid-cols-2">
          <AudiencePanel
            featured
            icon={Lock}
            role="For maintainers"
            title="Fund the work you need done."
            points={[
              'Describe the work. Its text is hashed on-chain, so it cannot change.',
              'Lock the prize and the deadline in the contract.',
              'Pick the winners yourself. Unused prizes come back to you.',
            ]}
            cta="Post a bounty"
            to="/create"
          />
          <AudiencePanel
            icon={GitPullRequest}
            role="For contributors"
            title="Get paid for what you ship."
            points={[
              'Every listed bounty already has its prize locked.',
              'Submit before the deadline. Your entry is recorded on-chain.',
              'Claim from the contract and keep your share minus 5%.',
            ]}
            cta="Browse open bounties"
            to="/explore"
          />
        </div>
      </section>

      <Story />

      <OpenNow />

      <section aria-labelledby="checks" className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHead id="checks" title="Checks you can see.">
            Rules live in the contract and in the open, so you do not have to take anyone’s word for them.
          </SectionHead>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {CHECKS.map((c, i) => (
            <Reveal as="li" key={c.title} delay={i * 60} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5">
              <IconTile icon={c.icon} />
              <div>
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 max-w-[56ch] text-sm text-mute">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <Categories />

      <section aria-labelledby="everyone" className="space-y-10">
        <SectionHead id="everyone" title="Work from every corner of crypto.">
          A one-person fix and a ranked, multi-winner program use the same escrow. Post what you need, or take what you can do.
        </SectionHead>
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <Reveal as="h3" className="mb-2 font-display text-lg font-semibold">
              Who posts work
            </Reveal>
            <ul className="divide-y divide-line border-y border-line">
              {POSTERS.map((r, i) => (
                <Reveal as="li" key={r.title} delay={i * 60} className="grid grid-cols-[2.5rem_1fr] gap-4 py-4">
                  <IconTile icon={r.icon} />
                  <div>
                    <p className="font-display font-semibold">{r.title}</p>
                    <p className="mt-0.5 text-sm text-mute">{r.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
          <div>
            <Reveal as="h3" className="mb-2 font-display text-lg font-semibold">
              Who gets paid for it
            </Reveal>
            <ul className="divide-y divide-line border-y border-line">
              {SOLVERS.map((r, i) => (
                <Reveal as="li" key={r.title} delay={i * 60} className="grid grid-cols-[2.5rem_1fr] gap-4 py-4">
                  <IconTile icon={r.icon} />
                  <div>
                    <p className="font-display font-semibold">{r.title}</p>
                    <p className="mt-0.5 text-sm text-mute">{r.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="modules" className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="space-y-6">
          <SectionHead id="modules" title="More than one-off bounties." />
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
        <ArtFrame delay={150}>
          <BoardScene />
        </ArtFrame>
      </section>

      <section aria-labelledby="trust" className="space-y-8">
        <SectionHead id="trust" title="Every fact says where it comes from." />
        <Reveal className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="flex items-center gap-3 border-b border-line bg-sky/60 px-5 py-4 md:border-b-0">
              <FileCheck2 size={20} strokeWidth={1.75} aria-hidden />
              <h3 className="font-display font-semibold">Verified on-chain</h3>
            </div>
            <div className="hidden items-center gap-3 bg-paper px-5 py-4 md:flex">
              <Database size={20} strokeWidth={1.75} aria-hidden />
              <h3 className="font-display font-semibold">Recorded on BountyFi</h3>
            </div>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {COMPARE.map(([left, right]) => (
              <li key={left} className="grid md:grid-cols-2 md:divide-x md:divide-line">
                <span className="flex items-center gap-3 px-5 py-3.5 text-sm">
                  <Check size={16} strokeWidth={2.25} aria-hidden className="shrink-0" />
                  {left}
                </span>
                <span className="px-5 py-3.5 pl-[3.25rem] text-sm text-mute md:pl-5">
                  <span className="mb-0.5 block text-xs font-medium md:hidden">Recorded on BountyFi</span>
                  {right}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
        <p className="max-w-xl text-sm text-mute">Numbers from the contract are marked verified. Everything else is labelled as recorded, never shown as if it were on-chain.</p>
      </section>

      <section aria-labelledby="where" className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="rounded-lg border border-ink bg-surface shadow-retro">
          <div className="flex items-center justify-between border-b border-ink px-5 py-3">
            <span className="pixel-label text-mute">ISSUE COMMENT</span>
            <span className="num text-xs text-mute">maintainer</span>
          </div>
          <p className="num px-5 pt-5 text-lg font-medium">/bounty 200 react</p>
          <div className="m-5 rounded-md border border-line bg-sky/50 p-4 text-sm">
            <p>
              A <strong>200 USDC</strong> bounty for this issue is ready to post on BountyFi:
            </p>
            <p className="mt-2 font-medium underline underline-offset-4">Open the pre-filled form</p>
            <p className="mt-3 text-xs text-mute">Nothing has been created yet. You lock the prize from your own wallet.</p>
          </div>
        </Reveal>
        <div className="space-y-6">
          <SectionHead id="where" title="Start inside GitHub.">
            Comment on a GitHub issue and the bounty form opens filled in.
          </SectionHead>
          <ul className="divide-y divide-line border-y border-line">
            {[
              { icon: Terminal, title: 'GitHub command', body: 'Maintainers with write access can use it. It never creates a bounty on its own.' },
              { icon: Webhook, title: 'Chat webhooks', body: 'Discord, Slack and Telegram, sent after the indexer confirms an event.' },
              { icon: Braces, title: 'Public API', body: 'Read-only endpoints for bounties, projects, profiles and totals.' },
            ].map((r, i) => (
              <Reveal as="li" key={r.title} delay={i * 70} className="grid grid-cols-[2.5rem_1fr] gap-4 py-4">
                <IconTile icon={r.icon} />
                <div>
                  <h3 className="font-display font-semibold">{r.title}</h3>
                  <p className="mt-0.5 text-sm text-mute">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <Reveal>
            <ButtonLink to="/developers" variant="secondary">
              Open the developer page
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="arc" className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <ArtFrame>
          <FinalityScene />
        </ArtFrame>
        <div className="space-y-6">
          <SectionHead id="arc" title="Built on Arc.">
            BountyFi runs on Arc Testnet today. Arc Network is the infrastructure underneath, and BountyFi is its own product.
          </SectionHead>
          <ul className="divide-y divide-line border-y border-line">
            {[
              { icon: Coins, title: 'Gas is USDC', body: 'One token pays for funding, submitting and claiming.' },
              { icon: Timer, title: 'Final in under a second', body: 'Arc finality is deterministic, so a confirmed claim is settled.' },
              { icon: ScanSearch, title: 'Every step on the explorer', body: 'Each funding, pick and claim is a transaction you can open.' },
            ].map((r, i) => (
              <Reveal as="li" key={r.title} delay={i * 70} className="grid grid-cols-[2.5rem_1fr] gap-4 py-4">
                <IconTile icon={r.icon} />
                <div>
                  <h3 className="font-display font-semibold">{r.title}</h3>
                  <p className="mt-0.5 text-sm text-mute">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <Reveal>
            <ButtonLink to="/docs#arc" variant="secondary">
              Read how BountyFi uses Arc
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <Faq />

      <Reveal as="section" className="on-ink flex flex-col items-start justify-between gap-6 rounded-lg border border-ink bg-ink p-8 text-white sm:flex-row sm:items-center sm:p-10">
        <h2 className="max-w-md font-display text-3xl font-semibold leading-tight sm:text-4xl">Fund the first bounty, or claim the first prize.</h2>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/explore" variant="accent" size="lg">
            Browse open bounties
          </ButtonLink>
          <ButtonLink to="/docs" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            Read the docs
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  )
}
