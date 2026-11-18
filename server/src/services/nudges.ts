import { query } from '../db.js'
import { notify } from './notify.js'

/**
 * Time-based reminders that keep bounties moving. A creator who has submissions to review is reminded when the review
 * period starts and again on its third and last days; contributors are told when it runs out; winners are reminded to
 * claim before their 7 days end. Each reminder is stored once (a dedupe key), so running this as often as you like
 * never repeats one. Nothing here moves money or changes a bounty.
 */

const DAY = 86_400_000

interface ReviewRow {
  id: string
  onchain_id: number
  title: string
  creator_user_id: string
  deadline: string
}

export async function runNudges(now: Date = new Date()): Promise<{ creators: number; contributors: number; winners: number }> {
  const counts = { creators: 0, contributors: 0, winners: 0 }

  // ---- bounties past their deadline with submissions waiting -----------------------------------
  const reviewing = await query<ReviewRow>(
    `SELECT id, onchain_id::int AS onchain_id, title, creator_user_id, deadline
       FROM bounties
      WHERE onchain_status = 1 AND submission_count > 0 AND deadline < $1 AND moderation_status = 'approved' AND metadata_verified
        AND creator_user_id IS NOT NULL`,
    [now],
  )
  for (const b of reviewing.rows) {
    const day = Math.floor((now.getTime() - new Date(b.deadline).getTime()) / DAY)
    const link = `/bounty/${b.onchain_id}?tab=submissions`
    if (day === 0 || day === 3 || day === 6) {
      const left = 7 - day
      await notify({
        userId: b.creator_user_id,
        kind: 'review_reminder',
        title: day === 6 ? `Last day to pick winners: ${b.title}` : `Pick winners for “${b.title}”`,
        body:
          day === 0
            ? 'The deadline has passed. You have 7 days to review the submissions. After that you can take the prize back, and contributors will see that you did.'
            : `${left} ${left === 1 ? 'day' : 'days'} of the review period left. Contributors are waiting for a decision.`,
        link,
        dedupeKey: `nudge:review:${b.id}:${day}`,
      })
      counts.creators += 1
    }
    if (day >= 6) {
      const people = await query<{ user_id: string }>(
        `SELECT DISTINCT COALESCE(s.submitter_user_id, w.user_id) AS user_id
           FROM submissions s LEFT JOIN wallets w ON w.address = s.submitter_wallet
          WHERE s.bounty_id = $1 AND s.notes_verified AND COALESCE(s.submitter_user_id, w.user_id) IS NOT NULL`,
        [b.id],
      )
      for (const p of people.rows) {
        await notify({
          userId: p.user_id,
          kind: 'review_overdue',
          title: `The creator has not picked winners yet: ${b.title}`,
          body: 'The 7 day review period is ending. If the creator takes the prize back without picking anyone, you can report the bounty from its page.',
          link: `/bounty/${b.onchain_id}`,
          dedupeKey: `nudge:overdue:${b.id}`,
        })
        counts.contributors += 1
      }
    }
  }

  // ---- winners who have not claimed -----------------------------------------------------------------
  const unclaimed = await query<{ id: string; onchain_id: number; title: string; approved_at: string; user_id: string; wallet: string }>(
    `SELECT b.id, b.onchain_id::int AS onchain_id, b.title, b.approved_at, COALESCE(s.submitter_user_id, w.user_id) AS user_id, s.submitter_wallet AS wallet
       FROM bounties b
       JOIN submissions s ON s.bounty_id = b.id AND s.position IS NOT NULL
       LEFT JOIN wallets w ON w.address = s.submitter_wallet
      WHERE b.onchain_status = 2 AND b.approved_at IS NOT NULL AND COALESCE(s.submitter_user_id, w.user_id) IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM bounty_activity a WHERE a.bounty_id = b.id AND a.kind = 'claimed' AND a.actor_wallet = s.submitter_wallet)`,
  )
  for (const u of unclaimed.rows) {
    const day = Math.floor((now.getTime() - new Date(u.approved_at).getTime()) / DAY)
    if (day === 1 || day === 4 || day === 6) {
      const left = 7 - day
      await notify({
        userId: u.user_id,
        kind: 'claim_reminder',
        title: `Claim your prize: ${u.title}`,
        body: `${left} ${left === 1 ? 'day' : 'days'} left. After 7 days the creator can take back what has not been claimed.`,
        link: `/bounty/${u.onchain_id}`,
        dedupeKey: `nudge:claim:${u.id}:${u.wallet}:${day}`,
      })
      counts.winners += 1
    }
  }

  return counts
}

/** Runs once an hour while the server is up. Failures are logged and retried at the next tick. */
export function startNudges(): void {
  const tick = () => {
    runNudges().catch((err) => console.warn('[Nudges] failed:', (err as Error).message))
  }
  setTimeout(tick, 60_000).unref()
  setInterval(tick, 3_600_000).unref()
}
