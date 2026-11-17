import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react'
import { BountyCard, BountyCardSkeleton } from '@/components/bounty/BountyCard'
import { BountyRow, BountyRowSkeleton } from '@/components/bounty/BountyRow'
import { SaveSearchButton } from '@/components/ecosystem/SaveSearch'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Form'
import { Pagination } from '@/components/ui/Pagination'
import { useBounties, type BountyFilters } from '@/lib/api/queries'
import { useCategories } from '@/lib/api/ecosystem'
import { cn } from '@/lib/cn'
import { categoryIcon } from '@/lib/nav'

const PAGE_SIZE = 12

type State = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'all'

const STATES: { value: State; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'reward', label: 'Highest prize' },
  { value: 'deadline', label: 'Ending soonest' },
  { value: 'popular', label: 'Most submissions' },
] as const

const DEADLINES = [
  { value: '', label: 'Any time' },
  { value: '1', label: 'Within 24 hours' },
  { value: '7', label: 'Within a week' },
  { value: '30', label: 'Within a month' },
]

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-mute">{label}</p>
      {children}
    </div>
  )
}

const RAIL_ITEM =
  'inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border px-3.5 text-sm font-medium transition-colors'

export default function Explore() {
  const [params, setParams] = useSearchParams()
  const categories = useCategories()

  const state = (STATES.find((s) => s.value === params.get('state'))?.value ?? 'open') as State
  const sort = (SORTS.find((s) => s.value === params.get('sort'))?.value ?? 'newest') as BountyFilters['sort']
  const category = params.get('category') ?? ''
  const difficulty = params.get('difficulty') ?? ''
  const mode = params.get('mode') === 'team' || params.get('mode') === 'solo' ? (params.get('mode') as 'team' | 'solo') : undefined
  const within = params.get('within') ?? ''
  const skill = params.get('skill') ?? ''
  const project = params.get('project') ?? ''
  const minReward = params.get('min') ?? ''
  const maxReward = params.get('max') ?? ''
  const offset = Math.max(Number(params.get('offset')) || 0, 0)
  const urlSearch = params.get('q') ?? ''
  const view = params.get('view') === 'list' ? 'list' : 'grid'

  const [text, setText] = useState(urlSearch)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries({ offset: undefined, ...patch })) {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  useEffect(() => {
    setText(urlSearch)
  }, [urlSearch])

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    if (text === urlSearch) return
    const timer = window.setTimeout(() => update({ q: text }), 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const filters: BountyFilters = {
    state: state === 'all' ? undefined : state,
    sort,
    search: urlSearch || undefined,
    category: category || undefined,
    difficulty: difficulty || undefined,
    mode,
    skill: skill || undefined,
    project: project || undefined,
    deadlineWithin: within ? Number(within) : undefined,
    minReward: minReward ? Number(minReward) : undefined,
    maxReward: maxReward ? Number(maxReward) : undefined,
    limit: PAGE_SIZE,
    offset,
  }
  const query = useBounties(filters)
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0

  const activeFilters = [
    category && { key: 'category', label: categories.data?.find((c) => c.slug === category)?.name ?? category },
    difficulty && { key: 'difficulty', label: difficulty },
    mode && { key: 'mode', label: mode === 'team' ? 'Team bounties' : 'Solo bounties' },
    within && { key: 'within', label: DEADLINES.find((d) => d.value === within)?.label ?? '' },
    skill && { key: 'skill', label: `Skill: ${skill}` },
    project && { key: 'project', label: `Project: ${project}` },
    (minReward || maxReward) && { key: 'reward', label: `${minReward || '0'} to ${maxReward || 'any'} USDC` },
  ].filter(Boolean) as { key: string; label: string }[]

  // Category is chosen in the rail, so the panel counts only the other filters.
  const panelCount = activeFilters.filter((f) => f.key !== 'category').length

  const clearOne = (key: string) => (key === 'reward' ? update({ min: undefined, max: undefined }) : update({ [key]: undefined }))
  const clearAll = () => setParams({}, { replace: true })

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <div className="max-w-2xl space-y-3">
          <h1 className="page-title text-4xl sm:text-5xl">Explore bounties</h1>
          <p className="text-mute">Every bounty has its prize locked in the contract and has been reviewed by an admin.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="bounty-search" className="sr-only">
              Search bounties
            </label>
            <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <Input
              id="bounty-search"
              type="search"
              placeholder="Search by title, project or skill"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-12 rounded-lg border-ink/40 pl-11 text-base shadow-card"
            />
          </div>
          <div className="flex gap-3">
            <Button
              className="h-12 flex-1 sm:flex-none"
              icon={<SlidersHorizontal size={16} aria-hidden />}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="filter-panel"
            >
              Filters{panelCount > 0 ? ` (${panelCount})` : ''}
            </Button>
            <SaveSearchButton
              filters={{
                q: urlSearch || undefined,
                category: category || undefined,
                difficulty: difficulty || undefined,
                mode,
                skill: skill || undefined,
                project: project || undefined,
                min: minReward ? Number(minReward) : undefined,
                max: maxReward ? Number(maxReward) : undefined,
              }}
            />
          </div>
        </div>

        {filtersOpen && (
          <div id="filter-panel" className="grid gap-5 rounded-lg border border-ink bg-surface p-5 shadow-retro-sm sm:grid-cols-2 lg:grid-cols-3">
            <Labelled label="Difficulty">
              <Select aria-label="Difficulty" value={difficulty} onChange={(e) => update({ difficulty: e.target.value })}>
                <option value="">Any difficulty</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </Labelled>
            <Labelled label="Work type">
              <Select aria-label="Work type" value={mode ?? ''} onChange={(e) => update({ mode: e.target.value })}>
                <option value="">Solo and team</option>
                <option value="solo">Solo only</option>
                <option value="team">Team only</option>
              </Select>
            </Labelled>
            <Labelled label="Deadline">
              <Select aria-label="Deadline" value={within} onChange={(e) => update({ within: e.target.value })}>
                {DEADLINES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Labelled>
            <Labelled label="Prize in USDC">
              <div className="grid grid-cols-2 gap-2">
                <Input aria-label="Minimum prize" inputMode="numeric" placeholder="Min" defaultValue={minReward} key={`min-${minReward}`} onBlur={(e) => update({ min: e.target.value.replace(/\D/g, '') })} />
                <Input aria-label="Maximum prize" inputMode="numeric" placeholder="Max" defaultValue={maxReward} key={`max-${maxReward}`} onBlur={(e) => update({ max: e.target.value.replace(/\D/g, '') })} />
              </div>
            </Labelled>
            <Labelled label="Skill">
              <Input
                aria-label="Skill"
                placeholder="react, solidity, design"
                defaultValue={skill}
                key={`skill-${skill}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') update({ skill: e.currentTarget.value.trim().toLowerCase() })
                }}
                onBlur={(e) => update({ skill: e.target.value.trim().toLowerCase() })}
              />
            </Labelled>
            <div className="flex items-end">
              <Button variant="ghost" onClick={clearAll} disabled={activeFilters.length === 0 && state === 'open' && !urlSearch}>
                Clear everything
              </Button>
            </div>
          </div>
        )}
      </header>

      <section aria-label="Categories" className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div role="radiogroup" aria-label="Category" className="flex gap-2">
          <button
            type="button"
            role="radio"
            aria-checked={category === ''}
            onClick={() => update({ category: undefined })}
            className={cn(RAIL_ITEM, category === '' ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-ink/40')}
          >
            All work
          </button>
          {categories.data?.map((c) => {
            const Icon = categoryIcon(c.icon)
            const active = category === c.slug
            return (
              <button
                key={c.slug}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ category: active ? undefined : c.slug })}
                className={cn(RAIL_ITEM, active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-ink/40')}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden />
                {c.name}
              </button>
            )
          })}
        </div>
      </section>

      <section aria-label="Results" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
          <div role="radiogroup" aria-label="Bounty status" className="no-scrollbar -mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
            {STATES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={state === s.value}
                onClick={() => update({ state: s.value === 'open' ? undefined : s.value })}
                className={cn(
                  'min-h-10 shrink-0 whitespace-nowrap rounded-md px-3.5 text-sm font-medium transition-colors',
                  state === s.value ? 'bg-ink text-white' : 'text-mute hover:bg-ink/5 hover:text-ink',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <p className="num hidden text-sm text-mute sm:block" aria-live="polite">
              {query.isSuccess && `${total} ${total === 1 ? 'bounty' : 'bounties'}${urlSearch ? ` for “${urlSearch}”` : ''}`}
            </p>
            <div className="w-44">
              <label htmlFor="bounty-sort" className="sr-only">
                Sort by
              </label>
              <Select id="bounty-sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? undefined : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div role="group" aria-label="Layout" className="hidden rounded-md border border-line bg-surface p-0.5 sm:flex">
              {(
                [
                  ['grid', LayoutGrid, 'Grid'],
                  ['list', List, 'List'],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  aria-label={`${label} layout`}
                  onClick={() => update({ view: value === 'grid' ? undefined : value })}
                  className={cn('grid size-9 place-items-center rounded transition-colors', view === value ? 'bg-ink text-white' : 'text-mute hover:text-ink')}
                >
                  <Icon size={16} aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {activeFilters.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() => clearOne(f.key)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-ink bg-sky py-1 pl-2.5 pr-2 text-xs font-medium hover:bg-sky-deep"
                >
                  {f.label}
                  <X size={12} aria-label="Remove filter" />
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={clearAll} className="text-xs font-medium text-mute underline underline-offset-2 hover:text-ink">
                Clear all
              </button>
            </li>
          </ul>
        )}

        {query.isError ? (
          <ErrorState title="Bounties did not load" message="The server could not be reached." onRetry={() => void query.refetch()} />
        ) : query.isPending ? (
          view === 'grid' ? (
            <ul aria-busy className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <BountyCardSkeleton key={i} />
              ))}
            </ul>
          ) : (
            <ul aria-busy className="overflow-hidden rounded-lg border border-line">
              {Array.from({ length: 4 }, (_, i) => (
                <BountyRowSkeleton key={i} />
              ))}
            </ul>
          )
        ) : items.length === 0 ? (
          <EmptyState
            icon={Search}
            title={urlSearch || activeFilters.length > 0 ? 'Nothing matches these filters' : 'No bounties here yet'}
            action={
              urlSearch || activeFilters.length > 0 || state !== 'open' ? (
                <Button onClick={clearAll}>Clear search and filters</Button>
              ) : (
                <ButtonLink to="/create" variant="primary">
                  Post the first bounty
                </ButtonLink>
              )
            }
          >
            {urlSearch || activeFilters.length > 0 ? 'Try fewer filters, or search for a skill such as react or rust.' : 'Bounties show up here after an admin approves them.'}
          </EmptyState>
        ) : view === 'grid' ? (
          <ul className={cn('grid gap-5 transition-opacity md:grid-cols-2 lg:grid-cols-3', query.isPlaceholderData && 'opacity-60')}>
            {items.map((b) => (
              <BountyCard key={b.id} bounty={b} />
            ))}
          </ul>
        ) : (
          <ul className={cn('overflow-hidden rounded-lg border border-line bg-surface transition-opacity', query.isPlaceholderData && 'opacity-60')}>
            {items.map((b) => (
              <BountyRow key={b.id} bounty={b} />
            ))}
          </ul>
        )}

        <Pagination
          className="pt-2"
          total={total}
          limit={PAGE_SIZE}
          offset={offset}
          onChange={(o) => {
            update({ offset: o ? String(o) : undefined })
            window.scrollTo({ top: 0 })
          }}
        />
      </section>
    </div>
  )
}
