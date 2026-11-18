import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../auth.js'
import { HttpError, route } from '../lib/http.js'
import { rateLimit } from '../lib/limits.js'
import { GithubUnavailable, fetchIssue, parseIssueUrl } from '../services/github.js'

/** Start a bounty from a public GitHub issue. Only github.com issue links are fetched. */
export const githubRouter = Router()

githubRouter.get(
  '/issue',
  rateLimit({ windowMs: 60_000, max: 20 }),
  requireAuth,
  route(async (req: Request, res: Response) => {
    const url = typeof req.query.url === 'string' ? req.query.url.slice(0, 300) : ''
    if (!parseIssueUrl(url)) throw new HttpError(400, 'Paste the address of a GitHub issue, such as https://github.com/owner/repo/issues/12.')
    try {
      const issue = await fetchIssue(url)
      if (!issue) throw new HttpError(404, 'That issue was not found, or it is a pull request.')
      res.json({ issue })
    } catch (err) {
      if (err instanceof GithubUnavailable) throw new HttpError(503, err.message)
      throw err
    }
  }),
)
