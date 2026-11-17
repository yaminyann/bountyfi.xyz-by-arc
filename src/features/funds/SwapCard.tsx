import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { ArrowDownUp, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Callout, Spinner } from '@/components/ui/Feedback'
import { Field, Input, Select } from '@/components/ui/Form'
import { adapterFor, ARC_NETWORK, asSwapChain, loadKit, switchWalletHome } from '@/features/funds/circle'
import { errorMessage } from '@/lib/api/client'
import { appChain } from '@/lib/chain'

type Token = 'USDC' | 'EURC'

interface Review {
  key: string
  out: string
  min: string
  fees: { label: string; token: string; amount: string }[]
}

const short = (value: string) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 6 })

const SLIPPAGE = [
  { value: '50', label: '0.5%' },
  { value: '100', label: '1%' },
  { value: '300', label: '3%' },
]

/**
 * Swaps USDC and EURC on Arc with Circle's Swap capability, routed by a third-party aggregator. The quote shows the
 * expected and minimum amounts first; the swap only runs when the user presses the Swap button. USDC to the native
 * gas token is not offered because on Arc they are the same asset.
 */
export function SwapCard() {
  const { connector, address } = useAccount()
  const chainId = useChainId()
  const [tokenIn, setTokenIn] = useState<Token>('USDC')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('100')
  const [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState<'review' | 'swap' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ out: string; url?: string } | null>(null)

  if (!ARC_NETWORK) return <Callout tone="info" title="Swaps need Arc">This deployment is not on an Arc network, so there is nothing to swap on.</Callout>
  const arc = ARC_NETWORK
  const tokenOut: Token = tokenIn === 'USDC' ? 'EURC' : 'USDC'
  const valid = /^\d{1,9}(\.\d{1,6})?$/.test(amount) && Number(amount) > 0
  const key = `${tokenIn}|${amount}|${slippage}|${address}`
  const fresh = review?.key === key

  const request = async () => {
    if (!connector || !address) throw new Error('Connect your wallet first.')
    if (chainId !== appChain.id) await switchWalletHome(connector)
    const adapter = await adapterFor(connector)
    return { from: { adapter, chain: asSwapChain(arc) }, tokenIn, tokenOut, amountIn: amount, config: { slippageBps: Number(slippage) } }
  }

  const reviewQuote = async () => {
    setError(null)
    setDone(null)
    setBusy('review')
    try {
      const kit = await loadKit()
      const estimate = await kit.estimateSwap((await request()) as never)
      setReview({
        key,
        out: short(estimate.estimatedOutput.amount),
        min: short(estimate.stopLimit.amount),
        fees: (estimate.fees ?? []).map((f) => ({ label: String(f.type) === 'provider' ? 'Provider fee' : f.type === 'swap' ? 'Swap fee' : f.type === 'gas' ? 'Network gas' : f.type === 'developer' ? 'Developer fee' : String(f.type), token: String(f.token), amount: short(String(f.amount)) })),
      })
    } catch (err) {
      setReview(null)
      setError(errorMessage(err, 'No quote is available for this swap right now.'))
    } finally {
      setBusy(null)
    }
  }

  const swap = async () => {
    if (!fresh) return
    setError(null)
    setBusy('swap')
    try {
      const kit = await loadKit()
      const result = (await kit.swap((await request()) as never)) as unknown as { amountOut?: string; explorerUrl?: string }
      setDone({ out: result.amountOut ?? review?.out ?? '', url: result.explorerUrl })
      setReview(null)
    } catch (err) {
      setError(errorMessage(err, 'The swap did not go through. Nothing was exchanged.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <Field label="You pay">
          <Select value={tokenIn} onChange={(e) => { setTokenIn(e.target.value as Token); setReview(null) }}>
            <option value="USDC">USDC</option>
            <option value="EURC">EURC</option>
          </Select>
        </Field>
        <button
          type="button"
          aria-label="Switch the two tokens"
          onClick={() => { setTokenIn(tokenOut); setReview(null) }}
          className="mx-auto grid size-10 place-items-center rounded-md border border-ink bg-sky transition-transform hover:-translate-y-0.5 sm:mb-0.5"
        >
          <ArrowDownUp size={18} strokeWidth={1.75} aria-hidden />
        </button>
        <Field label="You receive">
          <Input value={tokenOut} readOnly aria-readonly />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Amount in ${tokenIn}`}>
          <Input inputMode="decimal" placeholder="10.00" value={amount} onChange={(e) => { setAmount(e.target.value.trim()); setReview(null) }} />
        </Field>
        <Field label="Slippage tolerance" hint="The swap stops if the price moves further than this.">
          <Select value={slippage} onChange={(e) => { setSlippage(e.target.value); setReview(null) }}>
            {SLIPPAGE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {review && fresh && (
        <dl className="space-y-2 rounded-lg border border-ink bg-surface p-4 text-sm">
          <div className="ledger-line">
            <dt className="text-mute">Expected to receive</dt>
            <span aria-hidden className="leader" />
            <dd className="num font-semibold">
              {review.out} {tokenOut}
            </dd>
          </div>
          <div className="ledger-line">
            <dt className="text-mute">At least</dt>
            <span aria-hidden className="leader" />
            <dd className="num">
              {review.min} {tokenOut}
            </dd>
          </div>
          {review.fees.map((f, i) => (
            <div key={i} className="ledger-line">
              <dt className="text-mute">{f.label}</dt>
              <span aria-hidden className="leader" />
              <dd className="num">
                {f.amount} {f.token}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {done && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <CheckCircle2 size={16} aria-hidden className="text-ok" />
          Swapped. You received {done.out} {tokenOut}.
          {done.url && (
            <a className="underline underline-offset-4" href={done.url} target="_blank" rel="noopener noreferrer">
              View the transaction
            </a>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant={fresh ? 'secondary' : 'primary'} loading={busy === 'review'} disabled={!valid || !connector || busy !== null} onClick={() => void reviewQuote()}>
          {fresh ? 'Refresh quote' : 'Review quote'}
        </Button>
        {fresh && (
          <Button variant="accent" loading={busy === 'swap'} disabled={busy !== null} onClick={() => void swap()}>
            Swap {amount} {tokenIn} for {tokenOut}
          </Button>
        )}
      </div>

      {busy === 'swap' && (
        <p className="flex items-center gap-2 text-sm text-mute">
          <Spinner size={16} /> Confirm in your wallet. This can take a moment.
        </p>
      )}

      <p className="text-xs text-mute">
        Swaps are routed through a third-party aggregator (currently LiFi), which can change by route, and are subject to its terms. {appChain.testnet ? 'Test tokens have no real value.' : 'This moves real funds. Start with a small amount.'}
      </p>
    </div>
  )
}
