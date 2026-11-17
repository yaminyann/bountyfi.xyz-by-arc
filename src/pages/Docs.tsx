import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { BoardScene, FinalityScene, HeroScene, ReceiptScene } from '@/components/art/Scenes'
import { Reveal } from '@/components/motion/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import { useAppConfig } from '@/lib/api/queries'
import { useCategories } from '@/lib/api/ecosystem'
import { appChain, explorerAddress } from '@/lib/chain'
import { cn } from '@/lib/cn'

/**
 * The BountyFi documentation. Everything here describes behaviour that exists in the contract or the app today.
 * Anything that depends on a deployment setting says so, and Arc facts follow Arc's own documentation (docs.arc.io).
 */

function H3({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 font-display text-lg font-semibold">{children}</h3>
}

function P({ children }: { children: ReactNode }) {
  return <p className="max-w-[68ch] text-ink/90">{children}</p>
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="max-w-[68ch] list-disc space-y-1.5 pl-5 marker:text-mute">{children}</ul>
}

function Ol({ children }: { children: ReactNode }) {
  return <ol className="max-w-[68ch] list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-mute">{children}</ol>
}

/** Label, leader, value: the ledger line used for every fee breakdown in the product. */
function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="max-w-xl space-y-2 rounded-lg border border-line bg-surface p-4">
      {rows.map(([label, value]) => (
        <div key={label} className="ledger-line text-sm">
          <dt className="shrink-0 text-mute">{label}</dt>
          <span aria-hidden className="leader" />
          <dd className="num min-w-0 break-all text-right text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-[68ch] rounded-lg border border-ink bg-signal/60 p-4 text-sm">
      <p className="font-display font-semibold">{title}</p>
      <div className="mt-1 text-ink/90">{children}</div>
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return <code className="num rounded bg-ink/[0.07] px-1 py-0.5 text-[0.85em]">{children}</code>
}

function Pair({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
      <dt className="font-display font-semibold">{term}</dt>
      <dd className="text-sm text-mute">{children}</dd>
    </div>
  )
}

interface DocSection {
  id: string
  title: string
  lead: string
  art?: ReactNode
  body: ReactNode
}

function useSections(): DocSection[] {
  const config = useAppConfig()
  const categories = useCategories()
  const contract = config.data?.contractAddress
  const treasury = config.data?.treasuryAddress
  const usdc = config.data?.usdcAddress
  const onramp = Boolean(config.data?.onramp)

  return [
    {
      id: 'vision',
      title: 'Vision',
      lead: 'Paying for work should take one decision from the person funding it and one click from the person who earned it.',
      art: <HeroScene />,
      body: (
        <>
          <P>
            Open-source maintainers, DAOs and small teams all have work that nobody gets to because paying for it is awkward. Invoices, chasing, trust. BountyFi replaces that with a prize in escrow: the money is locked first, so the person who does the work can see that it exists before starting.
          </P>
          <H3>What BountyFi holds to</H3>
          <Ul>
            <li>
              <strong>The contract is the source of truth for money.</strong> Prize, status and winners are read from the chain. The website is a window onto it, and it can be wrong only by being late.
            </li>
            <li>
              <strong>No owner key.</strong> The contract has no owner or admin role. Nobody at BountyFi can move, freeze or redirect a prize.
            </li>
            <li>
              <strong>Money and coordination stay apart.</strong> Milestones, team splits, applications and disputes help people work together. They never move USDC.
            </li>
            <li>
              <strong>Verified facts are marked.</strong> A number read from the contract is labelled as verified on-chain. A note, a review or a profile line is labelled as recorded on BountyFi.
            </li>
            <li>
              <strong>Nothing invented.</strong> Totals, counts and activity come from real data and are hidden while they are zero.
            </li>
          </Ul>
          <H3>Under consideration</H3>
          <P>
            A later contract version could put more coordination on-chain, such as payouts per milestone, an on-chain team split and a binding dispute outcome. None of it is built or promised, and any new contract would need an independent audit first. Today a bounty escrows one prize and pays it by place.
          </P>
        </>
      ),
    },
    {
      id: 'overview',
      title: 'How a bounty works',
      lead: 'Four moments, each a transaction you can read on the explorer.',
      body: (
        <>
          <Ol>
            <li>
              <strong>Create.</strong> The creator describes the work and calls <Code>createBounty</Code> with the title, a hash of the description, the prize, a deadline and how the prize is shared. The bounty is <em>Open</em> and nothing is locked yet.
            </li>
            <li>
              <strong>Fund.</strong> The creator calls <Code>fundBounty</Code>. The prize moves into the contract and a 0.5% fee goes to the treasury. The bounty is <em>Funded</em>.
            </li>
            <li>
              <strong>Submit.</strong> Until the deadline, any other wallet can submit once. The contract stores a hash of the submission text.
            </li>
            <li>
              <strong>Pick.</strong> The creator calls <Code>approveWinners</Code> once. Winner number one takes place one, and so on. Places nobody fills return to the creator in the same transaction. The bounty is <em>Approved</em>.
            </li>
            <li>
              <strong>Claim.</strong> Each winner calls <Code>claimReward</Code> and receives their share minus the 5% claim fee. When the last winner claims, the bounty is <em>Claimed</em>.
            </li>
          </Ol>
          <H3>Statuses</H3>
          <dl className="max-w-[68ch]">
            <Pair term="Open">Created, not funded. Not listed publicly. The creator can still cancel it.</Pair>
            <Pair term="Funded">The prize is locked. Contributors can submit until the deadline.</Pair>
            <Pair term="Approved">Winners are picked. They can claim. The creator can reclaim unclaimed prizes after 7 days.</Pair>
            <Pair term="Claimed">Every approved winner has claimed, or the creator reclaimed the rest.</Pair>
            <Pair term="Refunded">The creator took the prize back because the deadline passed without winners, or no winner claimed in time.</Pair>
            <Pair term="Cancelled">The creator cancelled before funding.</Pair>
          </dl>
        </>
      ),
    },
    {
      id: 'start',
      title: 'Getting started',
      lead: 'You need a Google account for identity and a wallet for money.',
      body: (
        <>
          <H3>Set up once</H3>
          <Ol>
            <li>Install a browser wallet and add Arc Testnet when the site asks. The site sets the network values for you.</li>
            <li>
              Get test USDC from the{' '}
              <a className="font-medium underline underline-offset-4" href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
                Circle faucet
              </a>
              . Test USDC has no real value. On Arc, USDC also pays for gas, so you do not need a second token.
            </li>
            <li>Sign in with Google, then link your wallet by signing one message. Signing is free and sends no transaction.</li>
          </Ol>
          <H3>To fund work</H3>
          <P>
            Open <Link className="font-medium underline underline-offset-4" to="/create">Post a bounty</Link>, describe the work and what counts as done, set the prize, the deadline and the places, then confirm in your wallet. Fund it from the bounty page. An admin reviews it and publishes it.
          </P>
          <H3>To earn</H3>
          <P>
            Pick a funded bounty from <Link className="font-medium underline underline-offset-4" to="/explore">Explore</Link>, submit before the deadline, and attach your notes. If the creator picks you, claim from the bounty page.
          </P>
        </>
      ),
    },
    {
      id: 'prizes',
      title: 'Prizes, fees and windows',
      lead: 'Every rate and window is fixed in the contract.',
      art: <ReceiptScene />,
      body: (
        <>
          <Facts
            rows={[
              ['Post fee', '0.5% of the prize, added at funding'],
              ['Claim fee', '5% of each winner’s payout, at claim'],
              ['Places per bounty', '1 to 10'],
              ['Claim window', '7 days from approval'],
              ['Review period', '7 days after the deadline'],
            ]}
          />
          <H3>Prize places</H3>
          <P>
            Shares are set in basis points when the bounty is created. They must add up to 10,000, never increase from one place to the next, and each place must pay at least one unit of USDC. The first place absorbs any rounding dust so the payouts always add up to the prize.
          </P>
          <H3>A worked example</H3>
          <P>A 100 USDC prize with one winner. The creator pays 100.50 USDC: 100 into escrow and 0.50 to the treasury. The winner claims and receives 95.00. The claim fee of 5.00 goes to the treasury. The post fee is never refunded.</P>
          <H3>When the creator can take money back</H3>
          <Ul>
            <li>If the deadline passed and nobody submitted, the creator can reclaim the prize at once.</li>
            <li>If someone submitted, the creator must wait 7 days after the deadline, so every submission can be reviewed.</li>
            <li>After approval, the creator can reclaim prizes that were not claimed within 7 days. A winner who already claimed keeps their payout, and a winner who has not claimed yet can still claim until the creator reclaims.</li>
          </Ul>
        </>
      ),
    },
    {
      id: 'publishing',
      title: 'Publishing and moderation',
      lead: 'The text is locked by its hash. The listing around it can be adjusted.',
      body: (
        <>
          <P>
            When a bounty is created, only its title and a hash of the description go on-chain. The creator then publishes the full text to BountyFi, and the server checks that it matches the hash. Because of this, the description, the acceptance criteria, the tags and the links cannot be edited after publishing.
          </P>
          <P>
            Listing details sit beside the bounty and are not part of the hash: category, difficulty, skills, solo or team, project, submission instructions and eligibility. The creator can change these later.
          </P>
          <P>
            An admin must approve a funded bounty before it appears publicly. Admins can approve or reject. They cannot change a prize, pick winners or touch the contract. Submissions follow the same rule: your notes are shown only if they match the hash recorded on-chain.
          </P>
        </>
      ),
    },
    {
      id: 'sectors',
      title: 'Kinds of work',
      lead: 'Anything with a clear outcome and a way to check it can carry a prize.',
      body: (
        <>
          <P>
            BountyFi is not only for code. Protocols, DAOs, foundations, exchanges, creators and open-source maintainers post work in every area below, and anyone with the skill can take it. Admins can add or rename kinds of work as the catalogue grows.
          </P>
          <dl className="max-w-[68ch]">
            {(categories.data ?? []).map((c) => (
              <Pair key={c.slug} term={c.name}>
                {c.description} <span className="text-ink/80">{c.examples.slice(0, 4).join(', ')}.</span>
              </Pair>
            ))}
          </dl>
          <H3>Who posts</H3>
          <P>Solo maintainers, startups and studios, DAOs and foundations, exchanges and wallets, and communities. A single bounty and a ranked multi-winner program use the same escrow.</P>
          <H3>Who gets paid</H3>
          <P>Developers, security researchers, designers, writers and translators, analysts, community builders and moderators. Your profile and reward history are built from what the contract recorded.</P>
        </>
      ),
    },
    {
      id: 'ecosystem',
      title: 'Projects, teams and reviews',
      lead: 'The pieces around a bounty that help people work together.',
      art: <BoardScene />,
      body: (
        <>
          <Note title="These are records, not money">
            Milestones, team shares, applications, disputes and recurring programs are stored by BountyFi. They never move USDC. The contract pays one prize by place, and that is the only way money leaves escrow.
          </Note>
          <dl className="max-w-[68ch]">
            <Pair term="Projects">A public page for a maintainer or team with its open bounties, contributors and reward history. Owners can add members as managers or reviewers.</Pair>
            <Pair term="Milestones">Split large work into reviewable pieces with planned rewards. Contributors submit against a milestone and the creator marks it reviewed.</Pair>
            <Pair term="Team bounties">Assemble a team, assign roles and agree the split. The team settles payment between themselves, because the contract pays a single wallet per place.</Pair>
            <Pair term="Applications">A creator can ask contributors to apply first. This is coordination only. It never stops anyone from submitting on-chain.</Pair>
            <Pair term="Reviews">Every submission has a thread: comments, requested revisions, approval or rejection. Project members review, but only the bounty creator’s wallet can pick winners.</Pair>
            <Pair term="Disputes">Either side can open a thread with a mediator. The outcome is recorded and non-binding.</Pair>
            <Pair term="Recurring programs">Plan weekly or monthly work and publish each cycle as its own funded bounty.</Pair>
            <Pair term="Profiles and leaderboard">Contributor profiles show what the contract recorded. The leaderboard ranks by USDC received and respects a profile’s opt-out.</Pair>
          </dl>
        </>
      ),
    },
    {
      id: 'trust',
      title: 'Trust and verification',
      lead: 'Each fact says where it comes from.',
      body: (
        <>
          <dl className="max-w-[68ch]">
            <Pair term="Verified on-chain">Prize, status, deadline, winners, claims, fees and submission hashes. Read from contract events by the indexer.</Pair>
            <Pair term="Recorded on BountyFi">Listing details, milestones, reviews, team roles, applications, profile text and notes.</Pair>
          </dl>
          <H3>Creator record</H3>
          <P>Counted from contract events: bounties funded, how many paid out, how many were reclaimed. It is a history, not a score.</P>
          <H3>GitHub pull request checks</H3>
          <P>
            A submission can link a pull request. BountyFi reads its state from github.com (open, closed, merged and its author) and shows it next to the submission. Only github.com pull links are fetched.
          </P>
          <H3>Encrypted reports</H3>
          <P>
            For confidential bounties such as security reports, a contributor encrypts the report in the browser to the creator’s public key. The server stores only ciphertext. The creator’s private key is wrapped with a key derived from a wallet signature, so the server never holds it in the clear. The creator sets the key once and chooses encrypted mode before the first submission.
          </P>
          <H3>README badge</H3>
          <P>
            Every active project has a live badge at <Code>/api/badge/&lt;project&gt;.svg</Code> showing its open bounties and USDC paid.
          </P>
        </>
      ),
    },
    {
      id: 'wallet',
      title: 'Accounts and wallet signatures',
      lead: 'A Google account proves who you are. The wallet proves who is paid.',
      body: (
        <>
          <P>
            Your account is a Google sign-in plus one wallet, linked by a signed message. One wallet belongs to one account and the other way round. Every action that changes something needs both.
          </P>
          <Ul>
            <li>The link message names your wallet, your account, the network and a one-time number. It expires in five minutes.</li>
            <li>Signing it is free and sends nothing to the chain.</li>
            <li>Sign BountyFi messages only on <Code>bountyfi.xyz</Code>. A site that asks for the same message elsewhere is not BountyFi.</li>
            <li>BountyFi never asks for a seed phrase or a private key.</li>
          </Ul>
          <P>
            The <Link className="font-medium underline underline-offset-4" to="/help">wallet help page</Link> explains each request your wallet can show.
          </P>
          {onramp && (
            <P>
              When the Buy USDC option appears on a funding screen, Circle runs the card or bank payment on its own page and sends the USDC to your linked wallet. BountyFi never sees your payment details.
            </P>
          )}
        </>
      ),
    },
    {
      id: 'funds',
      title: 'Add and move funds',
      lead: 'Get USDC onto Arc, bring it from another chain or swap it, all from your own wallet.',
      body: (
        <>
          <P>
            The <Link className="font-medium underline underline-offset-4" to="/wallet">Wallet and funds</Link> page in your workspace shows your USDC and EURC on Arc and has three tools. They run in your browser with your own wallet. BountyFi does not hold, route or charge a fee on these transfers.
          </P>
          <dl className="max-w-[68ch]">
            <Pair term="Buy with a card">Circle Onramp, when it is switched on for this deployment. Circle runs the payment on its own page and sends USDC to your linked wallet.</Pair>
            <Pair term="Bridge in">Circle’s Cross-Chain Transfer Protocol (CCTP) burns USDC on the source chain and mints it on Arc. You see a quote before anything moves.</Pair>
            <Pair term="Swap">Swap USDC and EURC on Arc with Circle’s Swap. It is routed by a third-party aggregator (currently LiFi), shows the expected and the minimum amount first, and only runs when you press Swap.</Pair>
            <Pair term="Faucet and providers">On the testnet, the Circle faucet gives test USDC and EURC. On mainnet, Arc lists providers that sell USDC on Arc directly.</Pair>
          </dl>
          <H3>How the bridge fees work</H3>
          <Ul>
            <li>
              <strong>Standard</strong> transfers skip the CCTP protocol fee and take longer, around fifteen minutes.
            </li>
            <li>
              <strong>Fast</strong> transfers usually finish in under a minute and add a protocol fee that depends on the source chain.
            </li>
            <li>
              <strong>Receive the exact amount</strong> pays the fees on the source chain, so all of the amount you entered arrives. It uses Circle’s Forwarding Service, so the mint on Arc is done for you.
            </li>
          </Ul>
          <P>
            Fee levels are set by Circle and Arc and can change. The quote shows the actual fees for your transfer before you confirm. Read more in Circle’s documentation of CCTP and the App Kit bridge.
          </P>
        </>
      ),
    },
    {
      id: 'arc',
      title: 'BountyFi on Arc',
      lead: 'BountyFi is built on Arc Network. It runs on Arc Testnet today.',
      art: <FinalityScene />,
      body: (
        <>
          <Facts
            rows={[
              ['Network', appChain.name],
              ['Chain ID', String(appChain.id)],
              ['Gas token', 'USDC'],
              ['Finality', 'Under one second'],
              ...(contract ? ([['Bounty contract', <a key="c" className="underline underline-offset-4" href={explorerAddress(contract)} target="_blank" rel="noopener noreferrer">{contract}</a>]] as [string, ReactNode][]) : []),
              ...(usdc ? ([['USDC (ERC-20)', <a key="u" className="underline underline-offset-4" href={explorerAddress(usdc)} target="_blank" rel="noopener noreferrer">{usdc}</a>]] as [string, ReactNode][]) : []),
              ...(treasury ? ([['Fee wallet', <a key="t" className="underline underline-offset-4" href={explorerAddress(treasury)} target="_blank" rel="noopener noreferrer">{treasury}</a>]] as [string, ReactNode][]) : []),
            ]}
          />
          <H3>What Arc changes for you</H3>
          <Ul>
            <li>
              <strong>One token.</strong> Arc takes gas in USDC, so a wallet with USDC can fund a bounty, submit and claim without a second asset.
            </li>
            <li>
              <strong>Final in under a second.</strong> Arc finality is deterministic, so a confirmed funding or claim does not need extra confirmations.
            </li>
            <li>
              <strong>Two views of the same USDC.</strong> As gas, USDC uses 18 decimals. As the ERC-20 token that the contract moves, it uses 6. BountyFi shows prizes in the 6-decimal token and never mixes the two.
            </li>
            <li>
              <strong>Mainnet exists, BountyFi is not on it.</strong> Arc has a mainnet with its own chain ID. This deployment is on the testnet, where USDC has no real value. A mainnet launch would follow an independent audit.
            </li>
          </Ul>
          <H3>How BountyFi names Arc</H3>
          <P>
            BountyFi is an independent product that uses Arc as infrastructure. Arc is named where it explains what BountyFi runs on, and BountyFi does not use the Arc logo. BountyFi is not operated or endorsed by Arc or Circle.
          </P>
          <P>
            Network values, contract addresses and runtime differences are in the{' '}
            <a className="font-medium underline underline-offset-4" href="https://docs.arc.io/" target="_blank" rel="noopener noreferrer">
              Arc documentation
            </a>
            .
          </P>
        </>
      ),
    },
    {
      id: 'funding',
      title: 'Funding a project on Arc',
      lead: 'Bounties pay for tasks. A grant can pay for the team.',
      body: (
        <>
          <P>
            Circle runs a Developer Grants program for teams building on Arc and the Circle developer platform. According to Circle’s announcement of the May 2026 relaunch, it is selective and milestone-driven: funding is in USDC, released as agreed milestones are met and approved, and it favours projects where Arc is central to how value moves and where Circle products are real building blocks.
          </P>
          <P>
            A maintainer can use both. A grant funds the roadmap, and BountyFi bounties turn single roadmap items into priced, open tasks that anyone can take. Milestones on a BountyFi bounty are a planning record for the same idea.
          </P>
          <P>
            BountyFi is not part of the grants program and does not review or promise grants. Details, eligibility and the application are on{' '}
            <a className="font-medium underline underline-offset-4" href="https://www.circle.com/grant" target="_blank" rel="noopener noreferrer">
              circle.com/grant
            </a>
            , with questions answered in the{' '}
            <a className="font-medium underline underline-offset-4" href="https://community.arc.io/public/resources/circle-developer-grants-questions-and-answers" target="_blank" rel="noopener noreferrer">
              grants FAQ
            </a>
            .
          </P>
        </>
      ),
    },
    {
      id: 'integrations',
      title: 'Integrations',
      lead: 'Bring bounties to where the work already is.',
      body: (
        <>
          <dl className="max-w-[68ch]">
            <Pair term="GitHub command">
              A maintainer comments <Code>/bounty 200 react</Code> on an issue. A small workflow replies with a link that opens the Post a bounty form with the title, prize, issue link and labels filled in. It creates nothing by itself, because locking a prize needs your wallet.
            </Pair>
            <Pair term="README badge">Embed the live badge of a project. See Trust and verification.</Pair>
            <Pair term="Chat webhooks">Project owners can send events (bounty live, submission, winners picked, reward claimed) to Discord, Slack or Telegram. Only those hosts are allowed.</Pair>
            <Pair term="Saved searches">Save a filter and get a notification, or a chat message, when a matching bounty goes live.</Pair>
            <Pair term="Public API">Read-only endpoints for bounties, projects, profiles and totals.</Pair>
          </dl>
          <P>
            Endpoints, events and the workflow file are on the{' '}
            <Link className="font-medium underline underline-offset-4" to="/developers">
              developers page
            </Link>
            .
          </P>
        </>
      ),
    },
    {
      id: 'security',
      title: 'Security and limits',
      lead: 'What is protected, and what you are trusting.',
      body: (
        <>
          <Note title="The contract has not had an independent audit">
            Treat it as testnet software. Do not lock money you cannot afford to lose on any network until an audit is published.
          </Note>
          <H3>What the contract guarantees</H3>
          <Ul>
            <li>No owner, admin or upgrade key. Fees go to a treasury address fixed at deployment.</li>
            <li>Only the creator can fund, pick winners or reclaim. Only an approved winner can claim their place.</li>
            <li>Approval happens once and is final.</li>
          </Ul>
          <H3>What you are trusting</H3>
          <Ul>
            <li>
              <strong>The creator decides.</strong> Nothing forces a creator to pick a winner. If nobody is picked, the creator can reclaim the prize 7 days after the deadline. Check the creator record before you invest time.
            </li>
            <li>
              <strong>The treasury address is permanent.</strong> If it were ever blocked by the USDC issuer, funding and claims would revert.
            </li>
            <li>
              <strong>BountyFi can be late or offline.</strong> It cannot change what is on-chain. The contract works without the website.
            </li>
          </Ul>
          <H3>Reporting a problem</H3>
          <P>
            Security contact details are published at <Code>/.well-known/security.txt</Code>.
          </P>
        </>
      ),
    },
    {
      id: 'faq',
      title: 'Questions',
      lead: 'The ones people ask first.',
      body: (
        <dl className="max-w-[68ch]">
          <Pair term="Does BountyFi hold my money?">No. The prize sits in the contract. BountyFi has no key that can move it.</Pair>
          <Pair term="Can the creator take the prize back after I submit?">Only after the deadline plus 7 days, and only if no winners were picked. Once winners are approved, the creator can reclaim only what winners left unclaimed after 7 days.</Pair>
          <Pair term="Why does my wallet show a different number of decimals for USDC?">Arc counts USDC with 18 decimals when it is gas and 6 when it is the token. BountyFi uses the 6-decimal token for prizes.</Pair>
          <Pair term="Can I edit a published bounty?">The description, criteria, tags and links are locked by their on-chain hash. The listing details can be changed.</Pair>
          <Pair term="Why was my bounty not listed?">It is listed after it is funded and an admin approves it. An unfunded bounty stays private.</Pair>
          <Pair term="Can a team win together?">The contract pays one wallet per place. A team picks one wallet and agrees the split between themselves, which the team panel records.</Pair>
          <Pair term="Is this on mainnet?">No. It runs on Arc Testnet, where USDC has no real value.</Pair>
        </dl>
      ),
    },
  ]
}

/** Highlights the section being read, so the contents list always shows where you are. */
function useActive(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
    // The list of ids is static for the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return active
}

export default function Docs() {
  const sections = useSections()
  const active = useActive(sections.map((s) => s.id))
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-4">
        <Reveal as="h1" className="page-title text-4xl sm:text-5xl">
          BountyFi documentation
        </Reveal>
        <Reveal delay={100} as="p" className="text-lg text-mute">
          How the escrow works, what each fact on the site means, and how BountyFi uses Arc.
        </Reveal>
      </header>

      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="group rounded-lg border border-line bg-surface lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
              On this page
              <ChevronDown size={16} aria-hidden className="text-mute transition-transform group-open:rotate-180" />
            </summary>
            <ul className="border-t border-line px-2 py-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')} className="flex min-h-11 items-center rounded-md px-2 text-sm text-mute hover:bg-ink/5 hover:text-ink">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <nav aria-label="On this page" className="hidden lg:block">
            <p className="pixel-label mb-3 text-mute">ON THIS PAGE</p>
            <ul className="space-y-0.5 border-l border-line">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={active === s.id ? 'true' : undefined}
                    className={cn(
                      '-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors',
                      active === s.id ? 'border-ink font-medium text-ink' : 'border-transparent text-mute hover:text-ink',
                    )}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 space-y-20">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24 space-y-5">
              <Reveal className="space-y-2">
                <h2 id={`${s.id}-h`} className="page-title">
                  {s.title}
                </h2>
                <p className="max-w-[60ch] text-lg text-mute">{s.lead}</p>
              </Reveal>
              {s.art && <div className="max-w-xl overflow-hidden rounded-lg border border-ink shadow-retro">{s.art}</div>}
              <div className="space-y-4">{s.body}</div>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-8">
            <ButtonLink to="/create" variant="accent">
              Post a bounty
            </ButtonLink>
            <ButtonLink to="/explore">Browse open bounties</ButtonLink>
          </div>
        </div>
      </div>
    </div>
  )
}
