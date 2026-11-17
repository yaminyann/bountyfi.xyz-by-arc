import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAppConfig } from '@/lib/api/queries'
import { appChain, explorerAddress } from '@/lib/chain'
import { shortAddress } from '@/lib/money'

const YEAR = new Date().getFullYear()

const LINK = 'text-sm text-mute underline-offset-4 transition-colors hover:text-ink hover:underline'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ledger-line text-sm">
      <dt className="text-mute">{label}</dt>
      <span aria-hidden className="leader" />
      <dd className="num text-ink">{children}</dd>
    </div>
  )
}

export function Footer() {
  const config = useAppConfig()
  const contract = config.data?.contractAddress
  const treasury = config.data?.treasuryAddress

  return (
    <footer className="mt-24 border-t border-ink/15 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="space-y-5">
          <Link to="/" aria-label="BountyFi home" className="inline-block">
            <img src="/brand/lockup.png" alt="BountyFi" width={760} height={186} className="h-auto w-44" />
          </Link>
          <p className="max-w-sm text-sm text-mute">Prizes stay in a smart contract until the creator picks the winners. Built on Arc.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            <Link className={LINK} to="/explore">
              Explore
            </Link>
            <Link className={LINK} to="/projects">
              Projects
            </Link>
            <Link className={LINK} to="/leaderboard">
              Leaderboard
            </Link>
            <Link className={LINK} to="/activity">
              Activity
            </Link>
            <Link className={LINK} to="/docs">
              Docs
            </Link>
            <Link className={LINK} to="/developers">
              Developers
            </Link>
            <Link className={LINK} to="/help">
              Wallet help
            </Link>
            <a className={LINK} href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
              Test USDC faucet
            </a>
          </nav>
        </div>

        <dl className="space-y-3 self-start rounded-lg border border-line bg-paper p-5">
          <p className="pixel-label pb-1 text-mute">ON-CHAIN</p>
          <Fact label="Network">{appChain.name}</Fact>
          {contract && (
            <Fact label="Contract">
              <a href={explorerAddress(contract)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {shortAddress(contract)}
              </a>
            </Fact>
          )}
          {treasury && (
            <Fact label="Fee wallet">
              <a href={explorerAddress(treasury)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {shortAddress(treasury)}
              </a>
            </Fact>
          )}
          <p className="pt-1 text-xs text-mute">{appChain.testnet ? 'Test USDC on Arc Testnet has no real value.' : 'Transactions are final and settle on-chain.'}</p>
        </dl>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-mute">© {YEAR} BountyFi. The contract has not had an independent audit.</p>
      </div>
    </footer>
  )
}
