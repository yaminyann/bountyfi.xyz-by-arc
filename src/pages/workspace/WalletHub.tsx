import { useState, type ReactNode } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { ArrowRightLeft, Banknote, CreditCard, Droplets, Network, Repeat, Store, Wallet, type LucideIcon } from 'lucide-react'
import { RequireIdentity } from '@/components/layout/RequireIdentity'
import { useIdentity } from '@/contexts/IdentityContext'
import { BuyUsdc } from '@/features/bounty/BuyUsdc'
import { BridgeCard } from '@/features/funds/BridgeCard'
import { SwapCard } from '@/features/funds/SwapCard'
import { EURC_ADDRESS } from '@/features/funds/circle'
import { ButtonLink } from '@/components/ui/Button'
import { PageHeader, Stat, StatGrid } from '@/components/ui/Feedback'
import { Tabs } from '@/components/ui/Tabs'
import { useUsdcAccount } from '@/hooks/useBountyContract'
import { useAppConfig } from '@/lib/api/queries'
import { appChain } from '@/lib/chain'
import { formatUsdc } from '@/lib/money'

type Tab = 'get' | 'bridge' | 'swap'

function Row({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <li className="grid gap-4 py-5 sm:grid-cols-[2.5rem_1fr_auto] sm:items-center">
      <span className="grid size-10 place-items-center rounded-md border border-ink bg-sky">
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <div className="mt-1 max-w-[62ch] text-sm text-mute">{children}</div>
      </div>
      {action && <div className="sm:justify-self-end">{action}</div>}
    </li>
  )
}

function GetUsdc({ onBridge }: { onBridge: () => void }) {
  const config = useAppConfig()
  const onramp = Boolean(config.data?.onramp)
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface px-5 shadow-card">
      <Row
        icon={CreditCard}
        title="Buy with a card or bank"
        action={onramp ? <div className="w-full min-w-56 sm:w-64"><BuyUsdc /></div> : undefined}
      >
        {onramp ? (
          <>Circle’s Onramp runs the payment on its own page and sends USDC to your linked wallet on Arc. BountyFi never sees your payment details.</>
        ) : (
          <>Circle’s Onramp is not switched on for this deployment yet. Until it is, use one of the options below.</>
        )}
      </Row>
      <Row icon={ArrowRightLeft} title="Bring USDC from another chain" action={<button type="button" onClick={onBridge} className="inline-flex h-10 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-white hover:bg-[#223247]">Open the bridge</button>}>
        Move USDC you already hold on another network to Arc with Circle’s Cross-Chain Transfer Protocol. Choose Standard to skip the protocol fee, or pay the fees on the source chain so the exact amount arrives.
      </Row>
      {appChain.testnet ? (
        <Row
          icon={Droplets}
          title="Test USDC and EURC from the faucet"
          action={
            <a className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-4 text-sm font-medium hover:border-ink/40" href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">
              Open the faucet
            </a>
          }
        >
          Choose Arc Testnet and the token. Test funds have no real value and are what you use on this site today.
        </Row>
      ) : (
        <Row
          icon={Store}
          title="Buy from a provider that supports Arc"
          action={
            <a className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-4 text-sm font-medium hover:border-ink/40" href="https://www.usdc.com/providers" target="_blank" rel="noopener noreferrer">
              See providers
            </a>
          }
        >
          Arc lists exchanges and wallets that sell USDC on Arc directly. Withdraw to the wallet you linked here.
        </Row>
      )}
      <Row icon={Repeat} title="Swap what you already have">
        Hold EURC? Swap it to USDC (or the other way) in the Swap tab, with a quote before anything moves.
      </Row>
    </ul>
  )
}

function Content() {
  const { address } = useAccount()
  const usdc = useUsdcAccount()
  const [tab, setTab] = useState<Tab>('get')
  const eurc = useReadContract({
    address: EURC_ADDRESS ?? undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: appChain.id,
    query: { enabled: Boolean(address && EURC_ADDRESS), refetchInterval: 20_000 },
  })

  return (
    <div className="space-y-8">
      <StatGrid columns={3}>
        <Stat icon={Wallet} label="USDC" value={usdc.balance !== undefined ? formatUsdc(usdc.balance, 4) : '...'} unit="USDC" hint="Prizes and fees are paid in this balance" />
        <Stat icon={Banknote} label="EURC" value={EURC_ADDRESS ? (eurc.data !== undefined ? formatUsdc(eurc.data, 4) : '...') : 'n/a'} unit={EURC_ADDRESS ? 'EURC' : undefined} hint={EURC_ADDRESS ? 'Euro stablecoin on Arc' : 'Not on this network'} />
        <Stat icon={Network} label="Network" value={appChain.name} hint={appChain.testnet ? 'Test funds only' : 'Real funds'} />
      </StatGrid>

      <section aria-label="Funding tools" className="space-y-5">
        <Tabs
          label="Funding tools"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'get', label: 'Get USDC' },
            { value: 'bridge', label: 'Bridge in' },
            { value: 'swap', label: 'Swap' },
          ]}
        />
        {tab === 'get' && <GetUsdc onBridge={() => setTab('bridge')} />}
        {tab === 'bridge' && (
          <div className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
            <BridgeCard />
          </div>
        )}
        {tab === 'swap' && (
          <div className="rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
            <SwapCard />
          </div>
        )}
      </section>

      <p className="max-w-3xl text-sm text-mute">
        These tools run in your browser with your own wallet. BountyFi does not hold, route or take a fee from these transfers. Arc counts USDC with 18 decimals as gas and 6 decimals as the token; balances here use the token.
      </p>
    </div>
  )
}

/**
 * The wallet must be signed in and linked, but not necessarily on Arc: the bridge moves the wallet to the source chain
 * on purpose, and the page must stay mounted while it does. Anything short of "ready" falls back to the usual prompts.
 */
function Gate({ children }: { children: ReactNode }) {
  const id = useIdentity()
  if (id.status === 'ready') return <>{children}</>
  return <RequireIdentity purpose="manage your funds">{children}</RequireIdentity>
}

export default function WalletHub() {
  return (
    <div>
      <PageHeader
        title="Wallet and funds"
        actions={
          <ButtonLink to="/explore" variant="secondary">
            Find work
          </ButtonLink>
        }
      >
        Add USDC, bring it from other chains and swap, all from your own wallet.
      </PageHeader>
      <Gate>
        <Content />
      </Gate>
    </div>
  )
}
