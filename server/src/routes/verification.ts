import crypto from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { requireAuth, requireLinkedWallet } from '../auth.js'
import { query } from '../db.js'
import { HttpError, route } from '../lib/http.js'
import { rateLimit } from '../lib/limits.js'
import { SLUG_RE } from '../lib/ecosystem.js'
import { GithubUnavailable, fetchRepoFile } from '../services/github.js'

/**
 * Verified projects. The owner proves they control the project's GitHub repository by committing a small file that
 * holds a code BountyFi gave them. Only github.com is ever contacted, and the address is built from the project's
 * stored GitHub link, so a project cannot make the server call anywhere else. Control of a repository says nothing
 * about the quality of the work: the badge means "the person running this page controls this repository".
 */
export const verificationRouter = Router()

export const VERIFY_FILE = '.bountyfi-verify'
const REPO_RE = /^https:\/\/github\.com\/([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100})\/?$/

interface ProjectRow {
  id: string
  github_url: string | null
  owner_user_id: string
  verification_token: string | null
  verified_at: string | null
}

async function ownedProject(req: Request): Promise<{ project: ProjectRow; owner: string; repo: string }> {
  const slug = String(req.params.slug).toLowerCase()
  if (!SLUG_RE.test(slug)) throw new HttpError(404, 'Project not found')
  const found = await query<ProjectRow>('SELECT id, github_url, owner_user_id, verification_token, verified_at FROM projects WHERE slug = $1', [slug])
  const project = found.rows[0]
  if (!project) throw new HttpError(404, 'Project not found')
  if (project.owner_user_id !== req.user!.id) throw new HttpError(403, 'Only the project owner can verify it.')
  const match = project.github_url ? REPO_RE.exec(project.github_url) : null
  if (!match) throw new HttpError(400, 'Set the project’s GitHub repository address first, in the form https://github.com/owner/repo.')
  return { project, owner: match[1], repo: match[2] }
}

verificationRouter.post(
  '/:slug/verification',
  rateLimit({ windowMs: 60_000, max: 20 }),
  requireAuth,
  requireLinkedWallet,
  route(async (req: Request, res: Response) => {
    const { project, owner, repo } = await ownedProject(req)
    let token = project.verification_token
    if (!token) {
      token = `bf-verify-${crypto.randomBytes(14).toString('hex')}`
      await query('UPDATE projects SET verification_token = $2 WHERE id = $1', [project.id, token])
    }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ token, file: VERIFY_FILE, repository: `${owner}/${repo}`, verified: project.verified_at !== null })
  }),
)

verificationRouter.post(
  '/:slug/verify',
  rateLimit({ windowMs: 60_000, max: 10 }),
  requireAuth,
  requireLinkedWallet,
  route(async (req: Request, res: Response) => {
    const { project, owner, repo } = await ownedProject(req)
    if (!project.verification_token) throw new HttpError(409, 'Ask for a verification code first.')
    let content: string | null
    try {
      content = await fetchRepoFile(owner, repo, VERIFY_FILE)
    } catch (err) {
      if (err instanceof GithubUnavailable) throw new HttpError(503, err.message)
      throw err
    }
    if (content === null) throw new HttpError(422, `GitHub has no ${VERIFY_FILE} file at the root of ${owner}/${repo}. Commit it to the default branch and try again.`)
    if (content.trim() !== project.verification_token) throw new HttpError(422, `The ${VERIFY_FILE} file does not contain your code. Copy the code exactly.`)
    await query('UPDATE projects SET verified_at = NOW(), verified_by = $2 WHERE id = $1', [project.id, `github:${owner}/${repo}`])
    res.json({ verified: true, verifiedBy: `github:${owner}/${repo}` })
  }),
)
