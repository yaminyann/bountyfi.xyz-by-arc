// Phase 1 trust controls: link safety and the admin blocklist, reports, saved bounties, per-bounty access rules,
// automatic submission checks, review reminders, verified projects, and leaderboard loops. Called by e2e.mjs last.
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export async function runTrustControlChecks(ctx, fakes) {
  const { api, tok, accounts, send, read, board, boardArtifact, usdc, mock, bountyCommitment, submissionCommitment, check, waitFor, db, databaseUrl } = ctx
  let r
  const usd = (n) => BigInt(n) * 1_000_000n
  console.log('\nTrust controls')

  // ---- helpers -----------------------------------------------------------------------------------------------
  const nextId = async () => Number(await read(board, boardArtifact.abi, 'getBountyCount')) + 1
  const makeBounty = async (who, title, listing = {}, reward = usd(10)) => {
    const id = await nextId()
    const meta = { title, description: `${title}. A task used by the trust controls test, long enough to pass every length rule and clear about what is wanted.`, acceptanceCriteria: 'Done when the reviewer can answer yes to each point.', tags: ['trust-test'], links: [] }
    await send(who, board, boardArtifact.abi, 'createBounty', [meta.title, bountyCommitment(meta), reward, BigInt(Math.floor(Date.now() / 1000) + 3600), [10000]])
    r = await api('POST', '/bounties', { auth: tok[who], body: { ...meta, onchainId: id, listing: { category: 'development', difficulty: 'beginner', skills: ['test'], workMode: 'solo', ...listing } } })
    if (r.status !== 201) throw new Error(`publish failed: ${JSON.stringify(r.body)}`)
    await send(who, usdc, mock.abi, 'approve', [board, reward + (reward * 50n) / 10_000n])
    await send(who, board, boardArtifact.abi, 'fundBounty', [BigInt(id)])
    await api('POST', `/bounties/${id}/refresh`)
    r = await api('POST', `/admin/bounties/${id}/moderation`, { auth: tok.admin, body: { decision: 'approved' } })
    if (r.status !== 200) throw new Error(`approve failed: ${JSON.stringify(r.body)}`)
    return id
  }
  const submit = async (who, id, description, pullRequestUrl = 'https://example.com/work/proof') => {
    const meta = { description, pullRequestUrl, attachments: [] }
    await send(who, board, boardArtifact.abi, 'submitWork', [BigInt(id), submissionCommitment(id, meta)])
    return api('POST', `/bounties/${id}/submissions`, { auth: tok[who], body: meta })
  }
  const notificationsOf = async (who, kind) => (await api('GET', '/me/notifications?limit=100', { auth: tok[who] })).body.items.filter((n) => n.kind === kind)

  // ---- 1. link safety -------------------------------------------------------------------------------------------
  r = await api('POST', '/links/check', { body: { urls: ['https://bit.ly/abc', 'https://192.168.0.1/x', 'https://github.com/acme/dash/pull/7', 'https://xn--pple-43d.com/login', 'https://user:pw@example.com/', 'http://example.com/a'] } })
  const lv = Object.fromEntries(r.body.items.map((i) => [i.url, i.level]))
  check('shorteners are blocked', lv['https://bit.ly/abc'] === 'block', r.body)
  check('raw IP addresses are blocked', lv['https://192.168.0.1/x'] === 'block')
  check('a normal GitHub link is fine', lv['https://github.com/acme/dash/pull/7'] === 'ok')
  check('look-alike hosts and plain http only warn', lv['https://xn--pple-43d.com/login'] === 'warn' && lv['http://example.com/a'] === 'warn')
  check('addresses with a hidden login part are blocked', lv['https://user:pw@example.com/'] === 'block')

  r = await api('POST', '/bounties', {
    auth: tok.creator,
    body: { title: 'Link test', description: 'A bounty whose text carries a shortened link, which must be refused before anything is stored.', acceptanceCriteria: 'Not applicable to this test.', tags: [], links: ['https://tinyurl.com/x'], onchainId: 9999 },
  })
  check('a bounty with a shortened link is refused', r.status === 422 && /not allowed/.test(r.body.error), r.body)

  r = await api('POST', '/admin/blocked-domains', { auth: tok.alice, body: { domain: 'evil.example' } })
  check('only admins can block a domain', r.status === 403)
  r = await api('POST', '/admin/blocked-domains', { auth: tok.admin, body: { domain: 'https://evil.example/path' } })
  check('a blocked domain must be a bare domain', r.status === 400, r.body)
  r = await api('POST', '/admin/blocked-domains', { auth: tok.admin, body: { domain: 'evil.example', reason: 'Phishing page seen in reports' } })
  check('an admin blocks a domain', r.status === 201, r.body)
  r = await api('GET', '/links/check?url=' + encodeURIComponent('https://login.evil.example/wallet'))
  check('the block covers its subdomains', r.body.level === 'block' && /blocked/.test(r.body.reasons[0]), r.body)
  r = await api('DELETE', '/admin/blocked-domains/evil.example', { auth: tok.admin })
  check('an admin unblocks it', r.status === 200)

  // ---- 1a. starting a bounty from a GitHub issue -----------------------------------------------------------------
  const issueUrl = (n) => '/github/issue?url=' + encodeURIComponent(`https://github.com/acme/dash/issues/${n}`)
  r = await api('GET', issueUrl(12))
  check('importing an issue needs a signed-in account', r.status === 401, r.body)
  r = await api('GET', '/github/issue?url=' + encodeURIComponent('https://example.com/acme/dash/issues/12'), { auth: tok.creator })
  check('only github.com issue links are accepted', r.status === 400, r.body)
  r = await api('GET', '/github/issue?url=' + encodeURIComponent('https://github.com/acme/dash/pull/7'), { auth: tok.creator })
  check('a pull request link is not an issue link', r.status === 400, r.body)
  r = await api('GET', issueUrl(12), { auth: tok.creator })
  const imported = r.body.issue
  check('an issue fills title, labels and the cleaned body', r.status === 200 && imported.title === 'Export button does nothing on Safari' && imported.labels.join() === 'bug,good first issue,safari' && imported.state === 'open', r.body)
  check('hidden comments are dropped and blank runs collapse', !/template note/.test(imported.body) && !/\n{3,}/.test(imported.body) && /Steps: open the table/.test(imported.body), imported.body)
  r = await api('GET', issueUrl(13), { auth: tok.creator })
  check('an issue that is really a pull request is refused', r.status === 404, r.body)
  r = await api('GET', issueUrl(99), { auth: tok.creator })
  check('a missing issue is a clean 404', r.status === 404, r.body)

  // ---- 1b. editing the listing wording after approval ----------------------------------------------------------
  const editId = await makeBounty('creator', 'Listing edit review test', { submissionInstructions: 'Send a link to your work.' })
  const listingBody = (extra) => ({ category: 'development', difficulty: 'beginner', skills: ['test'], workMode: 'solo', ...extra })
  r = await api('POST', `/bounties/${editId}/listing`, { auth: tok.creator, body: listingBody({ submissionInstructions: 'Send a link to your work.', difficulty: 'intermediate' }) })
  check('a change that is not wording is not flagged', r.status === 200 && r.body.flaggedForReview === false, r.body)
  r = await api('POST', `/bounties/${editId}/listing`, { auth: tok.creator, body: listingBody({ submissionInstructions: 'Pay the fee at https://bit.ly/pay first.' }) })
  check('a shortened link inside the instructions is refused', r.status === 422, r.body)
  r = await api('POST', `/bounties/${editId}/listing`, { auth: tok.creator, body: listingBody({ submissionInstructions: 'Send a link to your work and a short note on how you tested it.' }) })
  check('new wording on an approved bounty is flagged', r.status === 200 && r.body.flaggedForReview === true, r.body)
  r = await api('GET', '/bounties/' + editId)
  check('the bounty stays public while it waits', r.status === 200 && r.body.bounty.moderationStatus === 'approved', r.body)
  r = await api('GET', '/admin/bounties?moderation=edited', { auth: tok.admin })
  check('admins can list bounties edited after approval', r.body.items.some((b) => b.onchainId === editId && b.listingEditedAt && /how you tested/.test(b.submissionInstructions)), r.body)
  await waitFor(async () => (await api('GET', '/admin/overview', { auth: tok.admin })).body.moderation.edited >= 1, 'the overview counts edited bounties', 15_000)
  check('the overview counts them', true)
  const liveBefore = await notificationsOf('creator', 'bounty_approved')
  r = await api('POST', `/admin/bounties/${editId}/moderation`, { auth: tok.admin, body: { decision: 'approved' } })
  check('keeping it approved clears the flag', r.status === 200)
  r = await api('GET', '/admin/bounties?moderation=edited', { auth: tok.admin })
  check('and it leaves the edited list', !r.body.items.some((b) => b.onchainId === editId), r.body)
  check('keeping an approved bounty does not announce it again', (await notificationsOf('creator', 'bounty_approved')).length === liveBefore.length)
  r = await api('GET', '/links/check?url=' + encodeURIComponent('https://login.evil.example/wallet'))
  check('and the link is fine again', r.body.level === 'ok', r.body)

  // ---- 2. reports ---------------------------------------------------------------------------------------------------
  r = await api('POST', '/reports', { body: { targetType: 'bounty', targetId: '1', reason: 'scam' } })
  check('reporting needs a signed-in account', r.status === 401)
  r = await api('POST', '/reports', { auth: tok.alice, body: { targetType: 'bounty', targetId: '1', reason: 'scam', details: 'The creator asked me to pay a fee in a message.' } })
  check('alice reports a bounty', r.status === 201, r.body)
  r = await api('POST', '/reports', { auth: tok.alice, body: { targetType: 'bounty', targetId: '1', reason: 'spam' } })
  check('a repeat report from the same person is accepted quietly', r.status === 200 && r.body.alreadyReported === true, r.body)
  r = await api('POST', '/reports', { auth: tok.alice, body: { targetType: 'bounty', targetId: '99999', reason: 'scam' } })
  check('reporting something that does not exist is a 404', r.status === 404)
  r = await api('POST', '/reports', { auth: tok.bob, body: { targetType: 'bounty', targetId: '1', reason: 'scam' } })
  check('a second person reports the same bounty', r.status === 201)
  r = await api('GET', '/admin/reports', { auth: tok.alice })
  check('the queue is for admins', r.status === 403)
  r = await api('GET', '/admin/reports?status=open', { auth: tok.admin })
  const first = r.body.items.find((i) => i.targetType === 'bounty' && i.targetId === '1')
  check('the admin queue shows the reports with how many people reported the target', first && first.reportsOnTarget === 2, r.body)
  r = await api('POST', `/admin/reports/${first.id}`, { auth: tok.admin, body: { status: 'actioned', note: 'Creator contacted and warned.' } })
  check('an admin resolves a report', r.status === 200, r.body)
  r = await api('POST', `/admin/reports/${first.id}`, { auth: tok.admin, body: { status: 'dismissed' } })
  check('a report cannot be resolved twice', r.status === 409)
  check('the reporter is told the outcome', (await notificationsOf(first.reporterEmail === 'alice@test.dev' ? 'alice' : 'bob', 'report_resolved')).length === 1)

  // ---- 3. saved bounties -------------------------------------------------------------------------------------------------
  r = await api('PUT', '/me/saved/1', { auth: tok.alice })
  check('alice saves a bounty', r.status === 200 && r.body.saved === true, r.body)
  r = await api('GET', '/me/saved/ids', { auth: tok.alice })
  check('the saved ids include it', r.body.ids.includes(1), r.body)
  r = await api('GET', '/me/saved', { auth: tok.alice })
  check('the saved list returns the bounty with its details', r.body.items.some((b) => b.onchainId === 1 && b.title), r.body)
  r = await api('GET', '/me/saved/ids', { auth: tok.bob })
  check('saved bounties are private to the person', !r.body.ids.includes(1))
  r = await api('PUT', '/me/saved/99999', { auth: tok.alice })
  check('a bounty that does not exist cannot be saved', r.status === 404)
  r = await api('DELETE', '/me/saved/1', { auth: tok.alice })
  r = await api('GET', '/me/saved/ids', { auth: tok.alice })
  check('removing it works', r.status === 200 && !r.body.ids.includes(1))

  // ---- 4. access rules, automatic checks and reminders -------------------------------------------------------------------
  const gated = await makeBounty('creator', 'Gated task: account age', { minAccountAgeDays: 1 })
  r = await api('GET', `/bounties/${gated}/eligibility`, { auth: tok.bob })
  check('a brand new account is told what it is missing', r.status === 200 && r.body.eligible === false && /days old/.test(r.body.reasons[0]), r.body)
  r = await submit('bob', gated, 'Delivered the gated task with notes that explain the approach and the result in some detail.')
  check('its notes are refused while the account is too new', r.status === 403 && /cannot be shown/.test(r.body.error), r.body)

  await db.query(`UPDATE users SET created_at = NOW() - INTERVAL '5 days' WHERE email = 'bob@test.dev'`)
  await new Promise((res) => setTimeout(res, 300))
  r = await api('GET', `/bounties/${gated}/eligibility`, { auth: tok.bob })
  check('an older account is eligible', r.body.eligible === true, r.body)
  r = await api('POST', `/bounties/${gated}/submissions`, { auth: tok.bob, body: { description: 'Delivered the gated task with notes that explain the approach and the result in some detail.', pullRequestUrl: 'https://example.com/work/proof', attachments: [] } })
  check('and the notes now attach', r.status === 201, r.body)

  const github = await makeBounty('creator', 'Gated task: GitHub profile', { requireGithub: true })
  r = await api('GET', `/bounties/${github}/eligibility`, { auth: tok.carol })
  check('a contributor without a GitHub profile is told to add one', r.body.eligible === false && /GitHub/.test(r.body.reasons.join(' ')), r.body)
  r = await api('POST', '/me/profile', { auth: tok.carol, body: { displayName: 'Carol', githubUrl: 'https://github.com/carol-test' } })
  r = await api('GET', `/bounties/${github}/eligibility`, { auth: tok.carol })
  check('adding it makes them eligible', r.body.eligible === true, r.body)

  const proven = await makeBounty('creator', 'Gated task: proven work', { minApprovedSubmissions: 50 })
  r = await api('GET', `/bounties/${proven}/eligibility`, { auth: tok.alice })
  check('a high bar for approved work is explained with the current count', r.body.eligible === false && /approved/.test(r.body.reasons[0]) && typeof r.body.progress.approvedSubmissions === 'number', r.body)

  r = await submit('alice', github, 'Delivered the GitHub gated task with a full write-up of the change and how it was tested.', 'https://example.com/work/a')
  check('alice (with a GitHub profile) submits to the GitHub gated bounty', r.status === 201, r.body)
  r = await api('GET', `/bounties/${github}/submissions`, { auth: tok.creator })
  const mine = r.body.submissions.find((s) => s.submitterWallet === accounts.alice.address.toLowerCase())
  check('the creator sees automatic checks on a submission', mine?.checks?.notesMatchHash === true && mine.checks.words > 5 && mine.checks.proofGiven === true && mine.checks.duplicateOf === null, mine)
  r = await api('GET', `/bounties/${github}/submissions`)
  check('the public does not see the checks', (r.body.submissions ?? []).every((s) => s.checks === null))

  const second = await makeBounty('creator', 'A second task for the same words')
  r = await submit('alice', second, 'Delivered the GitHub gated task with a full write-up of the change and how it was tested.', 'https://example.com/work/b')
  check('the same text on another task is attached', r.status === 201, r.body)
  r = await api('GET', `/bounties/${second}/submissions`, { auth: tok.creator })
  const copy = r.body.submissions.find((s) => s.submitterWallet === accounts.alice.address.toLowerCase())
  check('and flagged as a copy of her earlier submission', copy?.checks?.duplicateOf?.sameWallet === true && copy.checks.duplicateOf.score === 1, copy?.checks)

  const third = await makeBounty('creator', 'A third task for a near copy')
  r = await submit('bob', third, 'Delivered the GitHub gated task with a full write-up of the change and how it was tested thoroughly.', 'https://example.com/work/c')
  check('a near copy by someone else on another task is attached', r.status === 201, r.body)
  r = await api('GET', `/bounties/${third}/submissions`, { auth: tok.creator })
  const near = r.body.submissions.find((s) => s.submitterWallet === accounts.bob.address.toLowerCase())
  check('and flagged as close to earlier work from another account', near?.checks?.duplicateOf?.sameWallet === false && near.checks.duplicateOf.score >= 0.8 && near.checks.duplicateOf.score < 1, near?.checks)

  r = await submit('carol', second, 'Wrote a completely different answer that talks about other things such as design choices and edge cases found while testing.', 'https://bit.ly/short')
  check('a shortened proof link is refused on a submission', r.status === 422 && /not allowed/.test(r.body.error), r.body)

  // reminders: three days after the deadline, then six
  const days = (n) => `UPDATE bounties SET deadline = NOW() - INTERVAL '${n} days' - INTERVAL '1 hour' WHERE onchain_id = ${gated}`
  await db.query(days(3))
  r = await api('POST', '/admin/jobs/nudges', { auth: tok.admin })
  check('the reminder job tells the creator the review period is running', r.status === 200 && r.body.creators >= 1, r.body)
  const reminders = await notificationsOf('creator', 'review_reminder')
  check('the creator has a reminder linked to the submissions', reminders.some((n) => n.link.includes(`/bounty/${gated}`)), reminders)
  const count = (await notificationsOf('creator', 'review_reminder')).length
  await api('POST', '/admin/jobs/nudges', { auth: tok.admin })
  check('running it again does not repeat a reminder', (await notificationsOf('creator', 'review_reminder')).length === count)
  await db.query(days(6))
  r = await api('POST', '/admin/jobs/nudges', { auth: tok.admin })
  check('on the last day contributors are told the creator has not decided', r.body.contributors >= 1 && (await notificationsOf('bob', 'review_overdue')).length === 1, r.body)
  r = await api('POST', '/admin/jobs/nudges', { auth: tok.alice })
  check('only admins can run the job', r.status === 403)

  // ---- 5. verified projects -----------------------------------------------------------------------------------------------
  r = await api('POST', '/projects/acme', { auth: tok.creator, body: { name: 'Acme Labs', tagline: 'Open-source tools for builders', description: 'We build open-source tools.', websiteUrl: 'https://acme.example.com', githubUrl: 'https://github.com/acme/dash' } })
  check('the owner points the project at a repository', r.status === 200, r.body)
  r = await api('POST', '/projects/acme/verification', { auth: tok.alice })
  check('only the owner can start verifying', r.status === 403)
  r = await api('POST', '/projects/acme/verification', { auth: tok.creator })
  const code = r.body.token
  check('the owner gets a code and the file to commit', r.status === 200 && /^bf-verify-/.test(code) && r.body.file === '.bountyfi-verify' && r.body.repository === 'acme/dash', r.body)
  r = await api('POST', '/projects/acme/verify', { auth: tok.creator })
  check('verifying before the file exists is refused with a clear message', r.status === 422 && /no \.bountyfi-verify/.test(r.body.error), r.body)
  fakes.verify.content = 'not-the-code'
  r = await api('POST', '/projects/acme/verify', { auth: tok.creator })
  check('a file with the wrong code is refused', r.status === 422 && /does not contain/.test(r.body.error), r.body)
  fakes.verify.content = `${code}\n`
  r = await api('POST', '/projects/acme/verify', { auth: tok.creator })
  check('the right code verifies the project', r.status === 200 && r.body.verifiedBy === 'github:acme/dash', r.body)
  r = await api('GET', '/projects/acme')
  check('the project page shows it as verified', r.body.project?.verified === true || r.body.verified === true, r.body)
  r = await api('POST', '/projects/acme', { auth: tok.creator, body: { name: 'Acme Labs', tagline: 'Open-source tools for builders', description: 'We build open-source tools.', websiteUrl: 'https://acme.example.com', githubUrl: 'https://github.com/acme/other' } })
  r = await api('GET', '/projects/acme')
  check('changing the repository removes the badge until it is proven again', (r.body.project?.verified ?? r.body.verified) === false, r.body)

  // ---- 6. a loop of payments does not rank ------------------------------------------------------------------------------------
  const board1 = async () => Object.fromEntries((await api('GET', '/leaderboard?limit=100')).body.items.map((i) => [i.wallet, i.earned]))
  await new Promise((res) => setTimeout(res, 16_000))
  const before = await board1()
  const loop = async (creator, winner) => {
    const id = await makeBounty(creator, `Loop task from ${creator} to ${winner}`)
    r = await submit(winner, id, `Work delivered by ${winner} for ${creator}. This text names both people so that no two tasks share the same words.`, `https://example.com/loop/${creator}/${winner}`)
    if (r.status !== 201) throw new Error(`loop submit failed ${JSON.stringify(r.body)}`)
    await send(creator, board, boardArtifact.abi, 'approveWinners', [BigInt(id), [accounts[winner].address]])
    await api('POST', `/bounties/${id}/refresh`)
    await send(winner, board, boardArtifact.abi, 'claimReward', [BigInt(id)])
    await api('POST', `/bounties/${id}/refresh`)
    await waitFor(async () => (await db.query(`SELECT 1 FROM bounty_activity a JOIN bounties b ON b.id = a.bounty_id WHERE b.onchain_id = $1 AND a.kind = 'claimed'`, [id])).rowCount > 0 || null, `loop claim ${id}`)
  }
  await loop('carol', 'bob')
  await loop('bob', 'carol')
  await new Promise((res) => setTimeout(res, 16_000))
  const after = await board1()
  const bob = accounts.bob.address.toLowerCase()
  const carol = accounts.carol.address.toLowerCase()
  check('two wallets paying each other do not change either ranking', before[bob] === after[bob] && before[carol] === after[carol], { before: [before[bob], before[carol]], after: [after[bob], after[carol]] })
  r = await api('GET', '/leaderboard')
  check('the leaderboard counts how many different creators paid each person', r.body.items.every((i) => typeof i.creators === 'number' && i.creators >= 1), r.body.items[0])

  // ---- 7. pure rules and daily limits, run against the real code and database --------------------------------------------------------
  process.env.FIREBASE_PROJECT_ID = 'e2e-project'
  process.env.TREASURY_ADDRESS = '0x378862A20B312298dc54585CbabC531D70F9baE9'
  process.env.DATABASE_URL = databaseUrl
  const links = await import(pathToFileURL(path.join(root, 'server/dist/lib/links.js')).href)
  const trust = await import(pathToFileURL(path.join(root, 'server/dist/services/trust.js')).href)
  const dbmod = await import(pathToFileURL(path.join(root, 'server/dist/db.js')).href)
  check('a dotless or local host is not a public site', links.assessLinkShape('https://localhost/x').level === 'block' && links.assessLinkShape('https://intranet/x').level === 'block')
  check('download links warn', links.assessLinkShape('https://example.com/tool/setup.exe').level === 'warn')
  check('identical text has the same fingerprint however it is spaced or cased', trust.fingerprint('Hello,  World! test') === trust.fingerprint('hello world TEST'))
  check('near copies score high and different texts score low', trust.similarity('one two three four five six seven eight nine ten', 'one two three four five six seven eight nine eleven') > 0.5 && trust.similarity('alpha beta gamma delta epsilon zeta eta theta iota kappa', 'completely unrelated sentence about something else entirely here') < 0.1)

  const rows = await db.query(`INSERT INTO users (firebase_uid, email) VALUES ('uid-newbie', 'newbie@test.dev') RETURNING id`)
  const newbie = rows.rows[0].id
  process.env.TRUST_NEW_BOUNTIES_PER_DAY = '0'
  let capped = null
  try {
    await trust.assertCanPublish(newbie)
  } catch (err) {
    capped = err
  }
  check('a new account is held to the lower daily limit for bounties', capped?.status === 429 && /new account/.test(capped.message), capped?.message)
  const creatorRow = await db.query(`SELECT id FROM users WHERE email = 'creator@test.dev'`)
  process.env.TRUST_NEW_ACCOUNT_HOURS = '0'
  process.env.TRUST_BOUNTIES_PER_DAY = '1'
  capped = null
  try {
    await trust.assertCanPublish(creatorRow.rows[0].id)
  } catch (err) {
    capped = err
  }
  check('an established account has a daily limit too', capped?.status === 429, capped?.message)
  process.env.TRUST_BOUNTIES_PER_DAY = '500'
  delete process.env.TRUST_NEW_BOUNTIES_PER_DAY
  let fine = true
  try {
    await trust.assertCanPublish(creatorRow.rows[0].id)
  } catch {
    fine = false
  }
  check('and it passes under the default limit', fine)
  await dbmod.pool.end().catch(() => undefined)
}
