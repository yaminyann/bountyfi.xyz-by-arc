import { Link } from 'react-router-dom'
import { ArrowRightLeft, CreditCard, Repeat } from 'lucide-react'
import { useUsdcAccount } from '@/hooks/useBountyContract'
import { appChain } from '@/lib/chain'
import { formatUsdc } from '@/lib/money'

const ACTION =
  'inline-flex min-h-10 items-center gap-2 rounded-md border border-white/25 px-3.5 text-sm font-medium text-white transition-colors hover:border-signal hover:bg-signal hover:text-ink'

/** Balance and the three ways to add to it, shown at the top of the dashboards so funding is one click away. */
export function WalletStrip() {
  const usdc = useUsdcAccount()
  return (
    <section aria-label="Wallet" className="on-ink flex flex-col gap-5 rounded-lg border border-ink bg-ink p-5 text-white shadow-retro sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="text-sm text-white/70">Your USDC on {appChain.name}</p>
        <p className="num mt-1 font-display text-4xl font-semibold leading-none">
          {usdc.balance !== undefined ? formatUsdc(usdc.balance, 4) : '...'}
          <span className="ml-2 text-base font-medium text-white/70">USDC</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/wallet" className={ACTION}>
          <CreditCard size={16} aria-hidden /> Add USDC
        </Link>
        <Link to="/wallet" className={ACTION}>
          <ArrowRightLeft size={16} aria-hidden /> Bridge in
        </Link>
        <Link to="/wallet" className={ACTION}>
          <Repeat size={16} aria-hidden /> Swap
        </Link>
      </div>
    </section>
  )
}
