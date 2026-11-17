import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react'
import type { BridgeParams } from '@circle-fin/app-kit'
import { Button } from '@/components/ui/Button'
import { Callout, Skeleton, Spinner } from '@/components/ui/Feedback'
import { Field, Input, Select } from '@/components/ui/Form'
import { adapterFor, ARC_NETWORK, asBridgeChain, bridgeSources, loadKit, switchWalletHome, switchWalletTo, type EvmChain } from '@/features/funds/circle'
import { appChain } from '@/lib/chain'
import { errorMessage } from '@/lib/api/client'

type Speed = 'FAST' | 'SLOW'

interface Review {
  key: string
  receive: string
  debit: string
  fees: { label: string; amount: string }[]
  quote?: string
}

interface Step {
  name: string
  state: string
  explorerUrl?: string
}

/**
 * Brings USDC to Arc from another chain with Circle's Cross-Chain Transfer Protocol (CCTP). The reviewed quote and the
 * press of the Bridge button are the confirmation. Fees follow Circle's published model: Standard transfers skip the
 * CCTP protocol fee, Fast transfers add one that depends on the source chain, and fees can be paid on the source chain
 * so exactly the entered amount arrives (the recipient is always the connected wallet).
 */
export function BridgeCard() {
  const { connector, address } = useAccount()
  const [sources, setSources] = useState<EvmChain[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [speed, setSpeed] = useState<Speed>('FAST')
  const [exact, setExact] = useState(true)
  const [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState<'review' | 'bridge' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [steps, setSteps] = useState<Step[] | null>(null)

  useEffect(() => {
    let live = true
    bridgeSources()
      .then((list) => {
        if (!live) return
        setSources(list)
        setSource((cur) => cur || list.find((c) => c.chain === 'Base_Sepolia')?.chain || list.find((c) => c.chain === 'Ethereum_Sepolia')?.chain || list[0]?.chain || '')
      })
      .catch((err) => live && setLoadError(errorMessage(err, 'The bridge could not be loaded.')))
    return () => {
      live = false
    }
  }, [])

  if (!ARC_NETWORK) return <Callout tone="info" title="The bridge needs Arc">This deployment is not on an Arc network, so there is nowhere to bridge to.</Callout>
  const arc = ARC_NETWORK
  if (loadError) return <Callout tone="danger" title="The bridge did not load">{loadError}</Callout>
  if (!sources) return <Skeleton className="h-48 w-full" />

  const chain = sources.find((c) => c.chain === source)
  const valid = /^\d{1,9}(\.\d{1,6})?$/.test(amount) && Number(amount) > 0

  const params = async (): Promise<{ params: BridgeParams; adapter: Awaited<ReturnType<typeof adapterFor>> }> => {
    if (!connector || !chain || !address) throw new Error('Connect your wallet first.')
    await switchWalletTo(connector, chain)
    const adapter = await adapterFor(connector)
    const to = { adapter, chain: asBridgeChain(arc), recipientAddress: address, ...(exact ? { useForwarder: true } : {}) }
    const next = {
      from: { adapter, chain: asBridgeChain(chain.chain) },
      to,
      amount,
      config: exact ? { feePayment: 'source' as const } : { transferSpeed: speed },
    } as unknown as BridgeParams
    return { params: next, adapter }
  }

  const reviewQuote = async () => {
    setError(null)
    setSteps(null)
    setBusy('review')
    try {
      const kit = await loadKit()
      const { params: p } = await params()
      const estimate = (await kit.estimateBridge(p)) as unknown as {
        fees: { type: string; amount: string | null }[]
        amountReceived?: string
        totalDebit?: string
        feeTotal?: string
        quote?: string
      }
      const fees = (estimate.fees ?? []).filter((f) => f.amount !== null).map((f) => ({ label: f.type === 'provider' ? 'Circle fee' : f.type === 'gas' ? 'Network gas' : f.type === 'forwarder' ? 'Includes the Forwarding Service' : f.type, amount: String(f.amount) }))
      setReview({
        key: `${source}|${amount}|${speed}|${exact}`,
        receive: estimate.amountReceived ?? amount,
        debit: estimate.totalDebit ?? amount,
        fees: estimate.feeTotal ? [{ label: 'Fee paid on the source chain', amount: estimate.feeTotal }, ...fees.filter((f) => f.label !== 'Circle fee')] : fees,
        quote: estimate.quote,
      })
    } catch (err) {
      setReview(null)
      setError(errorMessage(err, 'The quote could not be fetched.'))
    } finally {
      setBusy(null)
    }
  }

  const bridge = async () => {
    if (!review || review.key !== `${source}|${amount}|${speed}|${exact}`) return
    setError(null)
    setBusy('bridge')
    try {
      const kit = await loadKit()
      const { params: p } = await params()
      const result = (await kit.bridge(review.quote ? ({ ...p, quote: review.quote } as BridgeParams) : p)) as unknown as { state: string; steps: Step[] }
      setSteps(result.steps ?? [])
      if (result.state !== 'success') setError('The transfer did not finish. Your USDC is safe: check the steps below, then try again from the quote.')
      setReview(null)
    } catch (err) {
      setError(errorMessage(err, 'The transfer failed.'))
    } finally {
      setBusy(null)
      // The wallet may have been moved to the source chain. Bring it home so the rest of the site works.
      if (connector) void switchWalletHome(connector).catch(() => undefined)
    }
  }

  const stale = review !== null && review.key !== `${source}|${amount}|${speed}|${exact}`

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From">
          <Select
            value={source}
            onChange={(e) => {
              setSource(e.target.value)
              setReview(null)
            }}
          >
            {sources.map((c) => (
              <option key={c.chain} value={c.chain}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount in USDC">
          <Input inputMode="decimal" placeholder="10.00" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-medium">Speed</legend>
        <div role="radiogroup" aria-label="Transfer speed" className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['FAST', 'Fast', 'Usually under a minute. Circle adds a small fee that depends on the source chain.'],
              ['SLOW', 'Standard', 'Takes longer, around fifteen minutes, and skips the CCTP protocol fee.'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={speed === value}
              disabled={exact && value === 'SLOW'}
              onClick={() => {
                setSpeed(value)
                setReview(null)
              }}
              className={`rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${speed === value ? 'border-ink bg-sky/50' : 'border-line bg-surface hover:border-ink/40'}`}
            >
              <span className="block font-display font-semibold">{label}</span>
              <span className="mt-1 block text-xs text-mute">{hint}</span>
            </button>
          ))}
        </div>
        {exact && <p className="text-xs text-mute">Standard speed is not offered while fees are paid on the source chain. Turn that off to choose Standard and skip the protocol fee.</p>}
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
          <input
            type="checkbox"
            checked={exact}
            onChange={(e) => {
              setExact(e.target.checked)
              setReview(null)
            }}
            className="mt-0.5 size-4 accent-ink"
          />
          <span>
            <span className="block font-medium">Receive the exact amount</span>
            <span className="text-mute">Pay the transfer fees on the source chain, so all {amount || 'of the'} USDC arrives. Uses Circle’s Forwarding Service, so you sign once and the mint on Arc is done for you.</span>
          </span>
        </label>
      </fieldset>

      {review && !stale && (
        <dl className="space-y-2 rounded-lg border border-ink bg-surface p-4 text-sm">
          <div className="ledger-line">
            <dt className="text-mute">You receive on Arc</dt>
            <span aria-hidden className="leader" />
            <dd className="num font-semibold">{review.receive} USDC</dd>
          </div>
          {review.fees.map((f) => (
            <div key={f.label} className="ledger-line">
              <dt className="text-mute">{f.label}</dt>
              <span aria-hidden className="leader" />
              <dd className="num">{f.amount} USDC</dd>
            </div>
          ))}
          <div className="ledger-line border-t border-line pt-2">
            <dt className="font-medium">Leaves your wallet on {chain?.name}</dt>
            <span aria-hidden className="leader" />
            <dd className="num font-semibold">{review.debit} USDC</dd>
          </div>
        </dl>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant={review && !stale ? 'secondary' : 'primary'} loading={busy === 'review'} disabled={!valid || !connector || busy !== null} onClick={() => void reviewQuote()} icon={<ArrowRightLeft size={16} aria-hidden />}>
          {review && !stale ? 'Refresh quote' : 'Review quote'}
        </Button>
        {review && !stale && (
          <Button variant="accent" loading={busy === 'bridge'} disabled={busy !== null} onClick={() => void bridge()}>
            Bridge {amount} USDC to Arc
          </Button>
        )}
      </div>

      {busy === 'bridge' && (
        <p className="flex items-center gap-2 text-sm text-mute">
          <Spinner size={16} /> Confirm each step in your wallet. This can take a few minutes. Keep this page open.
        </p>
      )}

      {steps && steps.length > 0 && (
        <ol className="space-y-2 text-sm">
          {steps.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <CheckCircle2 size={16} aria-hidden className={s.state === 'success' ? 'text-ok' : 'text-mute'} />
              <span className="font-medium">{s.name}</span>
              <span className="text-mute">{s.state}</span>
              {s.explorerUrl && (
                <a className="underline underline-offset-4" href={s.explorerUrl} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-mute">
        Bridging uses Circle’s Cross-Chain Transfer Protocol on {appChain.testnet ? 'testnets' : 'mainnet'}. {appChain.testnet ? 'Get test USDC on the source chain from the Circle faucet first. ' : 'This moves real USDC. Start with a small amount. '}BountyFi never holds your funds in this flow.
      </p>
    </div>
  )
}
