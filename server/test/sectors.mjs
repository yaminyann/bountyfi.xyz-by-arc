// One complete task for every work sector added in migration 007: post, fund, approve, submit, pick the winner,
// claim, and check that the sector shows up where people look for it. Called by e2e.mjs on the same chain and database.
//
// The contract is the same for every sector, so this also proves that nothing about escrow, review or payout depends
// on the kind of work. Review is a human decision by the creator in every sector; what is automatic is the escrow, the
// hash match of the text, the deadline, the fee split and the payout.

const SECTORS = [
  ['smart-contracts', 'Add fuzz tests for the vesting contract', 'advanced', ['solidity', 'foundry'], 'Fuzz suite pushed to a branch, with a short note on every invariant it covers.'],
  ['docs', 'Write a quickstart for the payments SDK', 'intermediate', ['technical-writing'], 'A quickstart that a new developer can finish in ten minutes, tested on a clean machine.'],
  ['content', 'Publish an explainer article on stablecoin settlement', 'beginner', ['writing', 'research'], 'A published article of at least 800 words with sources, original and not machine-translated.'],
  ['translation', 'Translate the onboarding flow into Portuguese', 'beginner', ['portuguese', 'localization'], 'Every onboarding string translated and reviewed by a second native speaker.'],
  ['video', 'Produce a two minute product walkthrough', 'intermediate', ['video-editing'], 'A two minute video with captions, delivered as a public link and the source project file.'],
  ['marketing', 'Run a partnership outreach sprint', 'intermediate', ['outreach', 'bd'], 'A list of fifteen qualified partners with a contacted-and-replied log.'],
  ['data', 'Build an on-chain dashboard of weekly payouts', 'intermediate', ['sql', 'analytics'], 'A public dashboard with the queries linked, refreshed weekly and reviewed for accuracy.'],
  ['governance', 'Draft a treasury reporting proposal', 'intermediate', ['governance', 'dao'], 'A proposal text with a reporting template and a worked example for the last quarter.'],
  ['defi', 'Model the fee mechanism under stress', 'advanced', ['tokenomics', 'python'], 'A reproducible simulation notebook with three stress scenarios and a written conclusion.'],
  ['ai', 'Ship an MCP server for bounty search', 'advanced', ['typescript', 'agents'], 'An MCP server with a documented tool for search and a passing test run in the repository.'],
  ['infrastructure', 'Add uptime monitoring and alerts', 'intermediate', ['devops', 'monitoring'], 'Health checks and alert rules deployed, with a runbook and a screenshot of a test alert.'],
  ['payments', 'Build a checkout widget for stablecoin payments', 'advanced', ['react', 'wallets'], 'A widget that completes a test payment end to end, with usage notes for merchants.'],
  ['games', 'Design the key art for a seasonal collection', 'beginner', ['illustration'], 'Five pieces of key art in layered source files, with usage rights stated in the delivery note.'],
  ['education', 'Create a beginner workshop on wallets', 'beginner', ['teaching', 'wallets'], 'A ninety minute workshop outline with slides, exercises and a feedback form.'],
  ['events', 'Host a community hackathon kickoff call', 'beginner', ['events', 'moderation'], 'A recorded kickoff call with a clear agenda, attendance list and follow-up post.'],
  ['support', 'Triage the open issue backlog', 'beginner', ['triage', 'support'], 'Every open issue labelled, duplicates linked and a summary of the top five themes.'],
]

export async function runSectorChecks(ctx) {
  const { api, tok, accounts, send, read, board, boardArtifact, usdc, mock, bountyCommitment, submissionCommitment, check, waitFor, db } = ctx
  let r
  const usd = (n) => BigInt(n) * 1_000_000n
  console.log('\nWork sectors from migration 007')

  r = await api('GET', '/categories')
  const slugs = new Set(r.body.items.map((c) => c.slug))
  check('every new sector is a public category', SECTORS.every(([slug]) => slugs.has(slug)), [...slugs])

  const solvers = ['alice', 'bob', 'carol']
  const reward = usd(10)
  let base = Number(await read(board, boardArtifact.abi, 'getBountyCount'))
  let completed = 0

  for (const [index, [slug, title, difficulty, skills, criteria]] of SECTORS.entries()) {
    const id = base + index + 1
    const solver = solvers[index % solvers.length]
    const meta = {
      title,
      description: `${title}. This task belongs to the ${slug} sector and is posted so that anyone with the right skill can take it, deliver the result and be paid from escrow.`,
      acceptanceCriteria: criteria,
      tags: ['sector-test', slug],
      links: [],
    }

    await send('creator', board, boardArtifact.abi, 'createBounty', [meta.title, bountyCommitment(meta), reward, BigInt(Math.floor(Date.now() / 1000) + 3600), [10000]])
    r = await api('POST', '/bounties', {
      auth: tok.creator,
      body: { ...meta, onchainId: id, listing: { category: slug, difficulty, skills, workMode: 'solo', submissionInstructions: 'Link the delivered work and explain how it meets each point of the criteria.' } },
    })
    check(`${slug}: the task is published with its sector`, r.status === 201 && r.body.bounty.category === slug, r.body)

    await send('creator', usdc, mock.abi, 'approve', [board, reward + (reward * 50n) / 10_000n])
    await send('creator', board, boardArtifact.abi, 'fundBounty', [BigInt(id)])
    await api('POST', `/bounties/${id}/refresh`)
    r = await api('POST', `/admin/bounties/${id}/moderation`, { auth: tok.admin, body: { decision: 'approved' } })
    check(`${slug}: an admin approves it`, r.status === 200, r.body)

    const listed = await waitFor(async () => {
      const x = await api('GET', `/bounties?category=${slug}&state=open`)
      return x.body.items.some((b) => b.onchainId === id) ? x.body : null
    }, `${slug} listing`)
    check(`${slug}: it is found when browsing the sector`, listed.items.every((b) => b.category === slug))

    const work = { description: `Delivered the ${slug} task. Every point of the acceptance criteria is covered in the linked work and the note below.`, pullRequestUrl: `https://example.com/work/${slug}`, attachments: [] }
    await send(solver, board, boardArtifact.abi, 'submitWork', [BigInt(id), submissionCommitment(id, work)])
    r = await api('POST', `/bounties/${id}/submissions`, { auth: tok[solver], body: work })
    check(`${slug}: ${solver} submits the work`, r.status === 201, r.body)
    r = await api('GET', `/bounties/${id}/submissions`, { auth: tok.creator })
    check(`${slug}: the creator sees the submission with its notes verified against the hash`, (r.body.submissions ?? []).some((s) => s.notesVerified === true), r.body)

    await send('creator', board, boardArtifact.abi, 'approveWinners', [BigInt(id), [accounts[solver].address]])
    await api('POST', `/bounties/${id}/refresh`)
    await send(solver, board, boardArtifact.abi, 'claimReward', [BigInt(id)])
    await api('POST', `/bounties/${id}/refresh`)

    const paid = await waitFor(async () => {
      const x = await db.query(
        `SELECT a.amount::text AS amount, a.fee::text AS fee FROM bounty_activity a JOIN bounties b ON b.id = a.bounty_id WHERE b.onchain_id = $1 AND a.kind = 'claimed'`,
        [id],
      )
      return x.rows[0] ?? null
    }, `${slug} claim`)
    check(`${slug}: the winner is paid 9.5 USDC after the 5% claim fee`, BigInt(paid.amount) === usd(10) && BigInt(paid.fee) === 500_000n, paid)

    r = await api('GET', `/bounties/${id}`)
    check(`${slug}: the task ends as paid out`, r.body.bounty.status === 3 && r.body.bounty.category === slug, r.body.bounty)
    completed += 1
  }

  check('all sixteen sector tasks ran from post to payout', completed === SECTORS.length, completed)
  r = await api('GET', '/bounties?state=completed&limit=50')
  const done = new Set(r.body.items.filter((b) => b.tags?.includes('sector-test')).map((b) => b.category))
  check('completed tasks can be browsed across every new sector', SECTORS.every(([slug]) => done.has(slug)), [...done])
}
