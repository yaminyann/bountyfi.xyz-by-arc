import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** The production address. Canonical links always point here, whatever address the page was opened from. */
const ORIGIN = 'https://bountyfi.xyz'

const TITLES: [string, string][] = [
  ['/explore', 'Explore bounties'],
  ['/categories', 'Categories'],
  ['/projects', 'Projects'],
  ['/leaderboard', 'Leaderboard'],
  ['/docs', 'Documentation'],
  ['/developers', 'Developers'],
  ['/help', 'Wallet help'],
  ['/activity', 'Activity'],
  ['/create', 'Post a bounty'],
  ['/dashboard', 'Workspace'],
  ['/workspace', 'Workspace'],
  ['/submissions', 'Submissions'],
  ['/rewards', 'Reward history'],
  ['/notifications', 'Notifications'],
  ['/settings', 'Settings and wallet'],
  ['/wallet', 'Wallet and funds'],
  ['/saved', 'Saved bounties'],
  ['/leaving', 'Leaving BountyFi'],
  ['/admin', 'Admin console'],
]

const DEFAULT_TITLE = 'BountyFi | Get paid in USDC for fixing open-source bugs'

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

/** Keeps the tab title, the canonical address and og:url in step with the route. */
export function PageMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    document.title = pathname === '/' ? DEFAULT_TITLE : match ? `${match[1]} | BountyFi` : pathname.startsWith('/bounty/') ? 'Bounty | BountyFi' : 'BountyFi'
    const url = `${ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`
    setLink('canonical', url)
    document.head.querySelector('meta[property="og:url"]')?.setAttribute('content', url)
  }, [pathname])

  return null
}
