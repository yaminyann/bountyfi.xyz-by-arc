import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink as OpenIcon, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Callout, Skeleton } from '@/components/ui/Feedback'
import { checkLink } from '@/lib/api/safety'

/**
 * Shown before leaving BountyFi for an address a user supplied. It states where the link goes and what BountyFi could
 * tell from the address alone. It cannot say a site is safe: the checks catch common disguises, not every bad site.
 */
export default function Leaving() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const to = params.get('to') ?? ''
  const valid = /^https?:\/\/\S+$/i.test(to) && to.length <= 2000
  const verdict = useQuery({ queryKey: ['link-check', to], queryFn: () => checkLink(to), enabled: valid, staleTime: 60_000 })

  if (!valid) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="page-title">This link cannot be opened</h1>
        <p className="text-mute">The address is missing or is not a web address.</p>
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </div>
    )
  }

  let host = to
  try {
    host = new URL(to).hostname
  } catch {
    // keep the raw text
  }
  const level = verdict.data?.level

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-3">
        <span className="grid size-12 place-items-center rounded-md border border-ink bg-sky shadow-retro-sm">{level === 'block' || level === 'warn' ? <ShieldAlert size={22} strokeWidth={1.75} aria-hidden /> : <ShieldCheck size={22} strokeWidth={1.75} aria-hidden />}</span>
        <h1 className="page-title">You are leaving BountyFi</h1>
        <p className="text-mute">This link was added by another person, not by BountyFi.</p>
      </header>

      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="text-xs font-medium text-mute">Goes to</p>
        <p className="mt-1 break-all font-display text-xl font-semibold">{host}</p>
        <p className="num mt-2 break-all text-xs text-mute">{to}</p>
      </div>

      {verdict.isPending && <Skeleton className="h-16 w-full" />}
      {verdict.isError && <Callout tone="warn" title="The address could not be checked">Open it only if you trust the person who shared it.</Callout>}
      {level === 'block' && (
        <Callout tone="danger" title="BountyFi will not open this link">
          <ul className="list-disc space-y-1 pl-5">
            {verdict.data?.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Callout>
      )}
      {level === 'warn' && (
        <Callout tone="warn" title="Be careful with this link">
          <ul className="list-disc space-y-1 pl-5">
            {verdict.data?.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Callout>
      )}
      {level === 'ok' && <Callout tone="info" title="Nothing unusual in the address">This is not a guarantee. Never enter a seed phrase or a private key on a site you reached from a bounty, and do not sign requests you do not understand.</Callout>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate(-1)}>Go back</Button>
        {level && level !== 'block' && (
          <a
            href={to}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-ink bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-[#223247]"
          >
            Continue to {host} <OpenIcon size={15} aria-hidden />
          </a>
        )}
      </div>
    </div>
  )
}
