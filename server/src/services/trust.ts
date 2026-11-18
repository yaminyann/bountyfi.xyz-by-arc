import crypto from 'node:crypto'
import { query } from '../db.js'
import { HttpError } from '../lib/http.js'
import { assessLink, type LinkVerdict } from '../lib/links.js'

/**
 * Trust controls that sit around the contract. The contract cannot refuse a submission or a bounty, so these rules
 * decide what BountyFi publishes and shows. They never move USDC.
 */

const num = (name: string, fallback: number): number => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && process.env[name] !== undefined && process.env[name] !== '' ? value : fallback
}

/** Defaults can be tuned from the environment (TRUST_*), which the end-to-end test uses to age its accounts. */
export const limits = () => ({
  /** Accounts younger than this are "new". */
  newAccountHours: num('TRUST_NEW_ACCOUNT_HOURS', 24),
  newBountiesPerDay: num('TRUST_NEW_BOUNTIES_PER_DAY', 3),
  bountiesPerDay: num('TRUST_BOUNTIES_PER_DAY', 15),
  newSubmissionsPerDay: num('TRUST_NEW_SUBMISSIONS_PER_DAY', 3),
  submissionsPerDay: num('TRUST_SUBMISSIONS_PER_DAY', 25),
  /** Two submissions this alike (shared five-word runs) count as the same text. */
  similarity: num('TRUST_SIMILARITY', 0.8),
})

async function userAge(userId: string): Promise<{ hours: number; days: number }> {
  const res = await query<{ hours: number }>('SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS hours FROM users WHERE id = $1', [userId])
  const hours = Number(res.rows[0]?.hours ?? 0)
  return { hours, days: Math.floor(hours / 24) }
}

/** A creator may publish only so many bounties a day, fewer while the account is new. */
export async function assertCanPublish(userId: string): Promise<void> {
  const L = limits()
  const age = await userAge(userId)
  const cap = age.hours < L.newAccountHours ? L.newBountiesPerDay : L.bountiesPerDay
  const used = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM bounties WHERE creator_user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [userId])
  if (used.rows[0].n >= cap) {
    throw new HttpError(429, `You have reached today's limit of ${cap} bounties${age.hours < L.newAccountHours ? ' for a new account' : ''}. Try again tomorrow.`)
  }
}

export interface Eligibility {
  eligible: boolean
  reasons: string[]
  /** What the account has now, so the person sees how far they are. */
  progress: { accountAgeDays: number; hasGithub: boolean; approvedSubmissions: number }
  dailyLimit: { used: number; cap: number }
}

interface Gate {
  min_account_age_days: number
  require_github: boolean
  min_approved_submissions: number
}

/** Whether this account may have its notes shown on a bounty, and what is missing if not. */
export async function checkEligibility(userId: string, wallet: string, gate: Gate): Promise<Eligibility> {
  const L = limits()
  const age = await userAge(userId)
  const profile = await query<{ github_url: string | null }>('SELECT github_url FROM contributor_profiles WHERE user_id = $1', [userId])
  const hasGithub = Boolean(profile.rows[0]?.github_url)
  const approved = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM submissions WHERE submitter_wallet = $1 AND (position IS NOT NULL OR review_status = 'approved')`,
    [wallet],
  )
  const used = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM submissions WHERE submitter_wallet = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [wallet])
  const cap = age.hours < L.newAccountHours ? L.newSubmissionsPerDay : L.submissionsPerDay

  const reasons: string[] = []
  if (age.days < gate.min_account_age_days) reasons.push(`This bounty asks for an account at least ${gate.min_account_age_days} days old. Yours is ${age.days}.`)
  if (gate.require_github && !hasGithub) reasons.push('This bounty asks for a GitHub profile on your contributor profile. Add it in Settings.')
  if (approved.rows[0].n < gate.min_approved_submissions) {
    reasons.push(`This bounty asks for ${gate.min_approved_submissions} approved ${gate.min_approved_submissions === 1 ? 'submission' : 'submissions'}. You have ${approved.rows[0].n}.`)
  }
  if (used.rows[0].n > cap) reasons.push(`You have sent more than ${cap} submissions today${age.hours < L.newAccountHours ? ', the limit for a new account' : ''}. Try again tomorrow.`)

  return { eligible: reasons.length === 0, reasons, progress: { accountAgeDays: age.days, hasGithub, approvedSubmissions: approved.rows[0].n }, dailyLimit: { used: used.rows[0].n, cap } }
}

// ---- text checks -------------------------------------------------------------------------------------------

const normalize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

export const wordCount = (text: string): number => normalize(text).length

/** A stable fingerprint of the words, so identical text pasted into different tasks is found by an index lookup. */
export function fingerprint(text: string): string {
  return crypto.createHash('sha256').update(normalize(text).join(' ')).digest('hex')
}

function shingles(words: string[], size = 5): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i + size <= words.length; i += 1) out.add(words.slice(i, i + size).join(' '))
  return out
}

/** Share of five-word runs two texts have in common (Jaccard). Short texts compare as whole sets of words. */
export function similarity(a: string, b: string): number {
  const wa = normalize(a)
  const wb = normalize(b)
  const sa = wa.length >= 8 && wb.length >= 8 ? shingles(wa) : new Set(wa)
  const sb = wa.length >= 8 && wb.length >= 8 ? shingles(wb) : new Set(wb)
  if (sa.size === 0 || sb.size === 0) return 0
  let shared = 0
  for (const s of sa) if (sb.has(s)) shared += 1
  return shared / (sa.size + sb.size - shared)
}

export interface SubmissionChecks {
  /** The notes match the hash recorded on-chain. Always true for stored notes. */
  notesMatchHash: boolean
  words: number
  proofGiven: boolean
  links: { level: LinkVerdict['level']; host: string; reasons: string[] }[]
  /** Another submission with the same or nearly the same text, if one exists. */
  duplicateOf: { bountyId: number; score: number; sameWallet: boolean } | null
}

/** Automatic checks run when notes are attached. They are shown to the creator as ticks; they never decide a winner. */
export async function computeChecks(input: { bountyRowId: string; wallet: string; description: string; pullRequestUrl: string | null; attachments: string[] }): Promise<{ checks: SubmissionChecks; print: string }> {
  const L = limits()
  const print = fingerprint(input.description)
  const urls = [input.pullRequestUrl, ...input.attachments].filter((u): u is string => Boolean(u))
  const links = await Promise.all(urls.map((u) => assessLink(u)))

  // Exact copies across any task, then near copies among this task's other submissions, this person's work and anyone's recent work.
  let duplicateOf: SubmissionChecks['duplicateOf'] = null
  const exact = await query<{ onchain_id: number; wallet: string }>(
    `SELECT b.onchain_id::int AS onchain_id, s.submitter_wallet AS wallet FROM submissions s JOIN bounties b ON b.id = s.bounty_id
      WHERE s.text_fingerprint = $1 AND NOT (s.bounty_id = $2 AND s.submitter_wallet = $3) LIMIT 1`,
    [print, input.bountyRowId, input.wallet],
  )
  if (exact.rows[0]) duplicateOf = { bountyId: exact.rows[0].onchain_id, score: 1, sameWallet: exact.rows[0].wallet === input.wallet }
  else {
    const others = await query<{ description: string; onchain_id: number; wallet: string }>(
      `SELECT s.description, b.onchain_id::int AS onchain_id, s.submitter_wallet AS wallet FROM submissions s JOIN bounties b ON b.id = s.bounty_id
        WHERE s.description IS NOT NULL AND NOT (s.bounty_id = $1 AND s.submitter_wallet = $2)
          AND (s.bounty_id = $1 OR s.submitter_wallet = $2 OR s.created_at > NOW() - INTERVAL '45 days')
        ORDER BY (s.bounty_id = $1) DESC, s.created_at DESC LIMIT 150`,
      [input.bountyRowId, input.wallet],
    )
    for (const o of others.rows) {
      const score = similarity(input.description, o.description)
      if (score >= L.similarity && (!duplicateOf || score > duplicateOf.score)) duplicateOf = { bountyId: o.onchain_id, score: Math.round(score * 100) / 100, sameWallet: o.wallet === input.wallet }
    }
  }

  return {
    print,
    checks: {
      notesMatchHash: true,
      words: wordCount(input.description),
      proofGiven: urls.length > 0,
      links: links.map((l) => ({ level: l.level, host: l.host, reasons: l.reasons })),
      duplicateOf,
    },
  }
}
