import { query } from '../db.js'
import { HttpError } from './http.js'

/**
 * Link safety. BountyFi never fetches a link a user supplies (that would let anyone point the server at an internal
 * address), so this judges the address itself: its shape, well-known URL shorteners that hide the destination, raw IP
 * addresses, look-alike (punycode) hosts, download-style files, and a blocklist that admins maintain. It is a filter
 * for the common tricks, not a reputation service, and it says so wherever the result is shown.
 */

export type LinkLevel = 'ok' | 'warn' | 'block'

export interface LinkVerdict {
  level: LinkLevel
  host: string
  reasons: string[]
}

const SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 't.ly', 'tiny.cc',
  'rb.gy', 'v.gd', 'shorte.st', 'adf.ly', 'bl.ink', 'lnkd.in', 'snip.ly', 'urlz.fr', 'x.co', 'soo.gd', 'clck.ru', 'qr.ae',
])

const DOWNLOAD_EXTENSIONS = /\.(exe|scr|msi|bat|cmd|ps1|apk|dmg|pkg|jar|vbs|iso|dll|lnk)$/i
const RISKY_TLDS = new Set(['zip', 'mov', 'cfd', 'sbs'])

let blockedCache: { at: number; domains: string[] } = { at: 0, domains: [] }

async function blockedDomains(): Promise<string[]> {
  if (Date.now() - blockedCache.at < 30_000) return blockedCache.domains
  const rows = await query<{ domain: string }>('SELECT domain FROM blocked_domains')
  blockedCache = { at: Date.now(), domains: rows.rows.map((r) => r.domain) }
  return blockedCache.domains
}

export function forgetBlockedDomains(): void {
  blockedCache = { at: 0, domains: [] }
}

/** Judges the shape of an address. Pure, so it also runs where the database is not at hand. */
export function assessLinkShape(raw: string): LinkVerdict {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { level: 'block', host: '', reasons: ['This is not a valid web address.'] }
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  const block: string[] = []
  const warn: string[] = []

  if (url.protocol !== 'https:' && url.protocol !== 'http:') block.push('Only web addresses are allowed.')
  if (url.protocol === 'http:') warn.push('This address is not encrypted (http).')
  if (url.username || url.password) block.push('The address contains a hidden login part, a common way to disguise the real site.')
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || /^\[/.test(url.host)) block.push('The address is a raw IP number instead of a site name.')
  else if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) block.push('The address is not a public site.')
  if (SHORTENERS.has(host)) block.push('Link shorteners hide where a link goes. Paste the full address.')
  if (host.split('.').some((label) => label.startsWith('xn--'))) warn.push('The site name uses look-alike characters.')
  if (host.split('.').length > 5) warn.push('The site name has an unusually long chain of parts.')
  const tld = host.split('.').pop() ?? ''
  if (RISKY_TLDS.has(tld)) warn.push(`The .${tld} ending is often used to imitate file names.`)
  if (DOWNLOAD_EXTENSIONS.test(url.pathname)) warn.push('The link downloads a program or installer. Do not run it outside a sandbox.')

  return { level: block.length > 0 ? 'block' : warn.length > 0 ? 'warn' : 'ok', host, reasons: [...block, ...warn] }
}

/** Shape rules plus the admin blocklist (the host or any parent domain of it). */
export async function assessLink(raw: string): Promise<LinkVerdict> {
  const verdict = assessLinkShape(raw)
  if (verdict.level === 'block' || !verdict.host) return verdict
  const blocked = (await blockedDomains()).find((d) => verdict.host === d || verdict.host.endsWith(`.${d}`))
  if (blocked) return { level: 'block', host: verdict.host, reasons: ['This site was blocked by BountyFi admins.', ...verdict.reasons] }
  return verdict
}

/** Throws 422 for the first link that is blocked. Warnings pass: they are shown to readers instead. */
const URL_IN_TEXT = /https?:\/\/[^\s<>"')]+/gi

/** Addresses written inside free text, so they get the same rules as links that were typed into a link field. */
export function urlsIn(...texts: (string | null | undefined)[]): string[] {
  return [...new Set(texts.join(' ').match(URL_IN_TEXT) ?? [])].slice(0, 20)
}

export async function assertLinksAllowed(urls: (string | null | undefined)[], label: string): Promise<LinkVerdict[]> {
  const verdicts: LinkVerdict[] = []
  for (const url of urls) {
    if (!url) continue
    const v = await assessLink(url)
    if (v.level === 'block') throw new HttpError(422, `${label}: ${url.slice(0, 80)} is not allowed. ${v.reasons[0]}`)
    verdicts.push(v)
  }
  return verdicts
}
