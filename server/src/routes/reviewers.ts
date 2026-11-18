import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getLinkedWallet, requireAuth, requireLinkedWallet } from '../auth.js'
import { query } from '../db.js'
import { HttpError, parse, parseOnchainId, route } from '../lib/http.js'
import { rateLimit } from '../lib/limits.js'
import { WALLET_RE, isBountyCreator, loadBountyAccess } from '../lib/ecosystem.js'
import { notify } from '../services/notify.js'

/**
 * Reviewers for one bounty. A creator names people they trust to read and discuss submissions. It is an unpaid,
 * advisory role: a reviewer comments in review threads but cannot pick winners (only the creator's wallet can) and no
 * USDC moves because of it. A person who has submitted work to the bounty cannot be its reviewer.
 */
export const reviewersRouter = Router()

const MAX_REVIEWERS = 5

reviewersRouter.get(
  '/:id/reviewers',
  requireAuth,
  route(async (req: Request, res: Response) => {
    const bounty = await loadBountyAccess(parseOnchainId(req.params.id))
    const wallet = await getLinkedWallet(req.user!.id)
    const mine = await query('SELECT 1 FROM bounty_reviewers WHERE bounty_id = $1 AND user_id = $2', [bounty.id, req.user!.id])
    const allowed = isBountyCreator(req, bounty) || (wallet !== null && wallet === bounty.creator_wallet) || (mine.rowCount ?? 0) > 0
    if (!allowed) throw new HttpError(403, 'Only the creator and its reviewers can see this list.')
    const rows = await query<{ wallet: string; displayName: string | null; addedAt: string }>(
      `SELECT r.wallet, u.display_name AS "displayName", r.created_at AS "addedAt"
         FROM bounty_reviewers r JOIN users u ON u.id = r.user_id WHERE r.bounty_id = $1 ORDER BY r.created_at`,
      [bounty.id],
    )
    res.json({ items: rows.rows, max: MAX_REVIEWERS })
  }),
)

const AddSchema = z.object({ wallet: z.string().trim().regex(WALLET_RE, 'Enter a wallet address that starts with 0x') })

reviewersRouter.post(
  '/:id/reviewers',
  rateLimit({ windowMs: 60_000, max: 20 }),
  requireAuth,
  requireLinkedWallet,
  route(async (req: Request, res: Response) => {
    const bounty = await loadBountyAccess(parseOnchainId(req.params.id))
    if (!isBountyCreator(req, bounty)) throw new HttpError(403, 'Only the creator can add reviewers.')
    const { wallet } = parse(AddSchema, req.body)
    const address = wallet.toLowerCase()
    if (address === bounty.creator_wallet) throw new HttpError(400, 'The creator already reviews this bounty.')

    const person = await query<{ user_id: string }>('SELECT user_id FROM wallets WHERE address = $1', [address])
    if (!person.rows[0]) throw new HttpError(404, 'That wallet has no BountyFi account yet. Ask them to sign in and link it first.')
    const submitted = await query('SELECT 1 FROM submissions WHERE bounty_id = $1 AND submitter_wallet = $2', [bounty.id, address])
    if ((submitted.rowCount ?? 0) > 0) throw new HttpError(409, 'Someone who submitted work to this bounty cannot review it.')
    const count = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM bounty_reviewers WHERE bounty_id = $1', [bounty.id])
    if (count.rows[0].n >= MAX_REVIEWERS) throw new HttpError(409, `A bounty can have up to ${MAX_REVIEWERS} reviewers.`)

    const added = await query('INSERT INTO bounty_reviewers (bounty_id, user_id, wallet, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [
      bounty.id,
      person.rows[0].user_id,
      address,
      req.user!.id,
    ])
    if ((added.rowCount ?? 0) > 0) {
      await notify({
        userId: person.rows[0].user_id,
        kind: 'reviewer_added',
        title: `You were asked to review: ${bounty.title}`,
        body: 'You can read its submissions and leave comments for the creator. You cannot pick winners, and no payment is attached to this role.',
        link: `/bounty/${bounty.onchain_id}?tab=submissions`,
      })
    }
    res.status(201).json({ ok: true })
  }),
)

reviewersRouter.delete(
  '/:id/reviewers/:wallet',
  rateLimit({ windowMs: 60_000, max: 30 }),
  requireAuth,
  route(async (req: Request, res: Response) => {
    const bounty = await loadBountyAccess(parseOnchainId(req.params.id))
    const address = String(req.params.wallet).toLowerCase()
    if (!WALLET_RE.test(address)) throw new HttpError(400, 'Invalid wallet address')
    const own = (await getLinkedWallet(req.user!.id)) === address
    if (!isBountyCreator(req, bounty) && !own) throw new HttpError(403, 'Only the creator, or the reviewer themselves, can remove a reviewer.')
    await query('DELETE FROM bounty_reviewers WHERE bounty_id = $1 AND wallet = $2', [bounty.id, address])
    res.json({ ok: true })
  }),
)
