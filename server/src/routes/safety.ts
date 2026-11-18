import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { adminEmail, requireAdmin, requireAuth } from '../auth.js'
import { query } from '../db.js'
import { HttpError, clampInt, isUuid, parse, queryString, route } from '../lib/http.js'
import { rateLimit } from '../lib/limits.js'
import { assessLink, forgetBlockedDomains } from '../lib/links.js'
import { WALLET_RE, SLUG_RE } from '../lib/ecosystem.js'
import { notify } from '../services/notify.js'

/** Reports from signed-in users and the link checks that back the "leaving BountyFi" page. */
export const reportsRouter = Router()
export const linksRouter = Router()
export const adminReportsRouter = Router()
export const adminDomainsRouter = Router()

const TARGETS = ['bounty', 'submission', 'profile', 'project'] as const
const REASONS = ['scam', 'spam', 'phishing', 'impersonation', 'plagiarism', 'inappropriate', 'other'] as const

const ReportSchema = z.object({
  targetType: z.enum(TARGETS),
  targetId: z.string().trim().min(1).max(80),
  reason: z.enum(REASONS),
  details: z.string().trim().max(1000).default(''),
})

/** Turns what the browser sends into the canonical id stored with the report, and proves the target exists. */
async function canonicalTarget(type: (typeof TARGETS)[number], rawId: string): Promise<string> {
  if (type === 'bounty') {
    if (!/^[1-9]\d{0,9}$/.test(rawId)) throw new HttpError(400, 'Invalid bounty id')
    const found = await query('SELECT 1 FROM bounties WHERE onchain_id = $1 AND metadata_verified LIMIT 1', [rawId])
    if (found.rowCount === 0) throw new HttpError(404, 'That bounty was not found.')
    return rawId
  }
  if (type === 'submission') {
    if (!isUuid(rawId)) throw new HttpError(400, 'Invalid submission id')
    const found = await query('SELECT 1 FROM submissions WHERE id = $1', [rawId])
    if (found.rowCount === 0) throw new HttpError(404, 'That submission was not found.')
    return rawId
  }
  if (type === 'profile') {
    if (!WALLET_RE.test(rawId)) throw new HttpError(400, 'Invalid wallet')
    return rawId.toLowerCase()
  }
  if (!SLUG_RE.test(rawId)) throw new HttpError(400, 'Invalid project')
  const found = await query('SELECT 1 FROM projects WHERE slug = $1', [rawId.toLowerCase()])
  if (found.rowCount === 0) throw new HttpError(404, 'That project was not found.')
  return rawId.toLowerCase()
}

reportsRouter.post(
  '/',
  rateLimit({ windowMs: 60_000, max: 10, key: (req) => `report:${req.ip}` }),
  requireAuth,
  route(async (req: Request, res: Response) => {
    const body = parse(ReportSchema, req.body)
    const user = req.user!
    const targetId = await canonicalTarget(body.targetType, body.targetId)

    const today = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM reports WHERE reporter_user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [user.id])
    if (today.rows[0].n >= 20) throw new HttpError(429, 'You have sent many reports today. Admins will get to them.')

    const saved = await query<{ id: string }>(
      `INSERT INTO reports (reporter_user_id, target_type, target_id, reason, details) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (reporter_user_id, target_type, target_id) WHERE status = 'open' DO NOTHING RETURNING id`,
      [user.id, body.targetType, targetId, body.reason, body.details],
    )
    // A repeat report from the same person is accepted quietly: nothing new for the admins to read.
    res.status(saved.rowCount === 0 ? 200 : 201).json({ ok: true, alreadyReported: saved.rowCount === 0 })
  }),
)

// ---- link checks, public (the "leaving BountyFi" page and form preflights use them) --------------------------

linksRouter.get(
  '/check',
  rateLimit({ windowMs: 60_000, max: 60 }),
  route(async (req: Request, res: Response) => {
    const url = queryString(req.query.url, 2000)
    if (!url) throw new HttpError(400, 'Give a link to check.')
    res.setHeader('Cache-Control', 'no-store')
    res.json(await assessLink(url))
  }),
)

linksRouter.post(
  '/check',
  rateLimit({ windowMs: 60_000, max: 30 }),
  route(async (req: Request, res: Response) => {
    const { urls } = parse(z.object({ urls: z.array(z.string().trim().max(2000)).max(20) }), req.body)
    res.setHeader('Cache-Control', 'no-store')
    res.json({ items: await Promise.all(urls.map(async (url) => ({ url, ...(await assessLink(url)) }))) })
  }),
)

// ---- admin: report queue ---------------------------------------------------------------------------------------

adminReportsRouter.use(requireAuth, requireAdmin)

adminReportsRouter.get(
  '/',
  route(async (req: Request, res: Response) => {
    const status = queryString(req.query.status, 12) ?? 'open'
    if (!['open', 'actioned', 'dismissed', 'all'].includes(status)) throw new HttpError(400, 'Invalid status')
    const limit = clampInt(req.query.limit, 20, 1, 100)
    const offset = clampInt(req.query.offset, 0, 0, 10_000)
    const params: unknown[] = []
    let where = ''
    if (status !== 'all') {
      params.push(status)
      where = 'WHERE r.status = $1'
    }
    params.push(limit, offset)
    // The reports on one target are counted so the most reported things rise to the top.
    const rows = await query(
      `SELECT r.id, r.target_type AS "targetType", r.target_id AS "targetId", r.reason, r.details, r.status, r.admin_note AS "adminNote",
              r.created_at AS "createdAt", r.resolved_at AS "resolvedAt", u.email AS "reporterEmail",
              (SELECT COUNT(DISTINCT r2.reporter_user_id)::int FROM reports r2 WHERE r2.target_type = r.target_type AND r2.target_id = r.target_id) AS "reportsOnTarget",
              COUNT(*) OVER()::int AS total
         FROM reports r JOIN users u ON u.id = r.reporter_user_id
         ${where}
        ORDER BY (r.status = 'open') DESC, "reportsOnTarget" DESC, r.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ items: rows.rows.map(({ total: _t, ...r }) => r), total: rows.rows[0]?.total ?? 0 })
  }),
)

adminReportsRouter.post(
  '/:id',
  rateLimit({ windowMs: 60_000, max: 60 }),
  route(async (req: Request, res: Response) => {
    const id = String(req.params.id)
    if (!isUuid(id)) throw new HttpError(404, 'Report not found')
    const { status, note } = parse(z.object({ status: z.enum(['actioned', 'dismissed']), note: z.string().trim().max(500).default('') }), req.body)
    const updated = await query<{ reporter_user_id: string; target_type: string; target_id: string }>(
      `UPDATE reports SET status = $2, admin_note = $3, resolved_by = $4, resolved_at = NOW() WHERE id = $1 AND status = 'open'
       RETURNING reporter_user_id, target_type, target_id`,
      [id, status, note, adminEmail(req)],
    )
    if (updated.rowCount === 0) throw new HttpError(409, 'This report was already resolved or does not exist.')
    const r = updated.rows[0]
    await query(`INSERT INTO admin_audit_log (admin_email, action, target_type, target_id, detail) VALUES ($1, $2, 'report', $3, $4)`, [
      adminEmail(req),
      `report.${status}`,
      id,
      JSON.stringify({ target: `${r.target_type}:${r.target_id}`, note }),
    ])
    await notify({
      userId: r.reporter_user_id,
      kind: 'report_resolved',
      title: status === 'actioned' ? 'Thanks, we acted on your report' : 'We reviewed your report',
      body: note || (status === 'actioned' ? 'An admin took action.' : 'An admin looked into it and did not find a problem.'),
      dedupeKey: `report:${id}`,
    })
    res.json({ ok: true })
  }),
)

// ---- admin: blocked domains --------------------------------------------------------------------------------------

adminDomainsRouter.use(requireAuth, requireAdmin)

const DomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/, 'Enter a domain such as example.com, without https:// or a path.'),
  reason: z.string().trim().max(200).default(''),
})

adminDomainsRouter.get(
  '/',
  route(async (_req: Request, res: Response) => {
    const rows = await query(`SELECT domain, reason, created_by AS "createdBy", created_at AS "createdAt" FROM blocked_domains ORDER BY created_at DESC LIMIT 500`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ items: rows.rows })
  }),
)

adminDomainsRouter.post(
  '/',
  rateLimit({ windowMs: 60_000, max: 30 }),
  route(async (req: Request, res: Response) => {
    const body = parse(DomainSchema, req.body)
    await query(`INSERT INTO blocked_domains (domain, reason, created_by) VALUES ($1, $2, $3) ON CONFLICT (domain) DO UPDATE SET reason = EXCLUDED.reason`, [body.domain, body.reason, adminEmail(req)])
    await query(`INSERT INTO admin_audit_log (admin_email, action, target_type, target_id, detail) VALUES ($1, 'domain.block', 'domain', $2, $3)`, [adminEmail(req), body.domain, JSON.stringify({ reason: body.reason })])
    forgetBlockedDomains()
    res.status(201).json({ ok: true })
  }),
)

adminDomainsRouter.delete(
  '/:domain',
  route(async (req: Request, res: Response) => {
    const domain = String(req.params.domain).toLowerCase()
    const gone = await query('DELETE FROM blocked_domains WHERE domain = $1', [domain])
    if (gone.rowCount === 0) throw new HttpError(404, 'That domain is not blocked.')
    await query(`INSERT INTO admin_audit_log (admin_email, action, target_type, target_id, detail) VALUES ($1, 'domain.unblock', 'domain', $2, '{}'::jsonb)`, [adminEmail(req), domain])
    forgetBlockedDomains()
    res.json({ ok: true })
  }),
)
