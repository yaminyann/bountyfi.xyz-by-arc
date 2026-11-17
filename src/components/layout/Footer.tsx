import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { FooterScene } from '@/components/art/Scenes'
import { DiscordIcon, LinkedinIcon, TelegramIcon, XIcon } from '@/components/ui/SocialIcons'
import { useAppConfig } from '@/lib/api/queries'
import { appChain, explorerAddress } from '@/lib/chain'
import { shortAddress } from '@/lib/money'
import { SOCIAL, type SocialKey } from '@/lib/social'

const YEAR = new Date().getFullYear()

const LINK = 'inline-flex min-h-8 items-center text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline'

const SOCIALS: { key: SocialKey; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: 'x', label: 'BountyFi on X', icon: XIcon },
  { key: 'linkedin', label: 'BountyFi on LinkedIn', icon: LinkedinIcon },
  { key: 'telegram', label: 'BountyFi on Telegram', icon: TelegramIcon },
  { key: 'discord', label: 'BountyFi on Discord', icon: DiscordIcon },
]

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-1">{children}</ul>
    </nav>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ledger-line text-sm">
      <dt className="shrink-0 text-white/60">{label}</dt>
      <span aria-hidden className="leader !border-white/25" />
      <dd className="num text-white">{children}</dd>
    </div>
  )
}

export function Footer() {
  const config = useAppConfig()
  const contract = config.data?.contractAddress
  const treasury = config.data?.treasuryAddress
  const socials = SOCIALS.filter((s) => SOCIAL[s.key])

  return (
    <footer className="on-ink mt-24 bg-ink text-white">
      <div className="border-b border-white/10 bg-[#0B121C]">
        <FooterScene />
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-10 pt-12 lg:grid-cols-[1.1fr_1.6fr] lg:gap-16">
        <div className="space-y-6">
          <Link to="/" aria-label="BountyFi home" className="inline-block">
            <img src="/brand/lockup.png" alt="BountyFi" width={760} height={186} className="h-auto w-48" />
          </Link>
          <p className="max-w-sm text-sm text-white/70">Prizes stay in a smart contract until the creator picks the winners. Built on Arc.</p>
          {socials.length > 0 && (
            <ul className="flex items-center gap-2" aria-label="BountyFi on social media">
              {socials.map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <a
                    href={SOCIAL[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-11 place-items-center rounded-md border border-white/20 text-white/80 transition-colors hover:border-signal hover:bg-signal hover:text-ink"
                  >
                    <Icon className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          <Column title="Platform">
            <li>
              <Link className={LINK} to="/explore">
                Explore bounties
              </Link>
            </li>
            <li>
              <Link className={LINK} to="/projects">
                Projects
              </Link>
            </li>
            <li>
              <Link className={LINK} to="/categories">
                Categories
              </Link>
            </li>
            <li>
              <Link className={LINK} to="/leaderboard">
                Leaderboard
              </Link>
            </li>
            <li>
              <Link className={LINK} to="/activity">
                Activity
              </Link>
            </li>
          </Column>

          <Column title="Resources">
            <li>
              <Link className={LINK} to="/docs">
                Documentation
              </Link>
            </li>
            <li>
              <Link className={LINK} to="/developers">
                Developers
              </Link>
            </li>
            <li>
              <Link className={LINK} to="/help">
                Wallet help
              </Link>
            </li>
            <li>
              <a className={LINK} href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
                Test USDC faucet
              </a>
            </li>
            <li>
              <a className={LINK} href="/.well-known/security.txt">
                Security contact
              </a>
            </li>
          </Column>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">On-chain</p>
            <dl className="space-y-2.5">
              <Fact label="Network">{appChain.name}</Fact>
              {contract && (
                <Fact label="Contract">
                  <a href={explorerAddress(contract)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-signal">
                    {shortAddress(contract)}
                  </a>
                </Fact>
              )}
              {treasury && (
                <Fact label="Fee wallet">
                  <a href={explorerAddress(treasury)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-signal">
                    {shortAddress(treasury)}
                  </a>
                </Fact>
              )}
            </dl>
            <p className="mt-3 text-xs text-white/60">{appChain.testnet ? 'Test USDC on Arc Testnet has no real value.' : 'Transactions are final and settle on-chain.'}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-xs text-white/60">
          <p>© {YEAR} BountyFi. All rights reserved.</p>
          <p>The contract has not had an independent audit. BountyFi is built on Arc and is not operated or endorsed by Arc or Circle.</p>
        </div>
      </div>
    </footer>
  )
}
