import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../auth.js'
import { query } from '../db.js'
import { HttpError, clampInt, parseOnchainId, route } from '../lib/http.js'
import { rateLimit } from '../lib/limits.js'
import { BOUNTY_LIST_COLUMNS } from '../services/projections.js'

/** Bounties a signed-in person saved to come back to. Private to them; saving one is not a signal to anyone else. */
export const savedRouter = Router()
savedRouter.use(requireAuth)

const PUBLIC_BOUNTY = `b.moderation_status = 'approved' AND b.metadata_verified`
const MAX_SAVED = 200

savedRouter.get(
  '/',
  route(async (req: Request, res: Response) => {
    const limit = clampInt(req.query.limit, 24, 1, 100)
    const offset = clampInt(req.query.offset, 0, 0, 1_000)
    const rows = await query(
      `SELECT ${BOUNTY_LIST_COLUMNS}, COUNT(*) OVER()::int AS total, sb.created_at AS "savedAt"
         FROM saved_bounties sb JOIN bounties b ON b.id = sb.bounty_id
        WHERE sb.user_id = $1 AND ${PUBLIC_BOUNTY}
        ORDER BY sb.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset],
    )
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ items: rows.rows.map(({ total: _t, ...b }) => b), total: rows.rows[0]?.total ?? 0 })
  }),
)

/** Just the ids, so every card can show whether it is saved without a request per card. */
savedRouter.get(
  '/ids',
  route(async (req: Request, res: Response) => {
    const rows = await query<{ id: number }>(
      `SELECT b.onchain_id::int AS id FROM saved_bounties sb JOIN bounties b ON b.id = sb.bounty_id WHERE sb.user_id = $1 AND ${PUBLIC_BOUNTY}`,
      [req.user!.id],
    )
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ ids: rows.rows.map((r) => r.id) })
  }),
)

savedRouter.put(
  '/:id',
  rateLimit({ windowMs: 60_000, max: 60 }),
  route(async (req: Request, res: Response) => {
    const id = parseOnchainId(req.params.id)
    const bounty = await query<{ id: string }>(`SELECT b.id FROM bounties b WHERE b.onchain_id = $1 AND ${PUBLIC_BOUNTY}`, [id])
    if (!bounty.rows[0]) throw new HttpError(404, 'Bounty not found')
    const count = await query<{ n: number }>('SELECT COUNT(*)::int AS n FROM saved_bounties WHERE user_id = $1', [req.user!.id])
    if (count.rows[0].n >= MAX_SAVED) throw new HttpError(409, `You can save up to ${MAX_SAVED} bounties. Remove some first.`)
    await query('INSERT INTO saved_bounties (user_id, bounty_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user!.id, bounty.rows[0].id])
    res.json({ saved: true })
  }),
)

savedRouter.delete(
  '/:id',
  route(async (req: Request, res: Response) => {
    const id = parseOnchainId(req.params.id)
    await query('DELETE FROM saved_bounties WHERE user_id = $1 AND bounty_id = (SELECT id FROM bounties WHERE onchain_id = $2)', [req.user!.id, id])
    res.json({ saved: false })
  }),
)
