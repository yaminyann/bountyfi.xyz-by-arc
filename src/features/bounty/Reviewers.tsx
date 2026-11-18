import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { AddressChip } from '@/components/ui/Address'
import { Input } from '@/components/ui/Form'
import { errorMessage } from '@/lib/api/client'
import { useAddReviewer, useBountyReviewers, useRemoveReviewer } from '@/lib/api/reviewers'

const WALLET = /^0x[0-9a-fA-F]{40}$/

/**
 * Lets the creator name people they trust to read and discuss submissions. The role is advisory and unpaid:
 * reviewers comment in the review threads, only the creator's wallet can pick winners, and no USDC moves.
 */
export function ReviewersPanel({ onchainId }: { onchainId: number }) {
  const list = useBountyReviewers(onchainId, true)
  const add = useAddReviewer(onchainId)
  const remove = useRemoveReviewer(onchainId)
  const [wallet, setWallet] = useState('')
  const items = list.data?.items ?? []
  const max = list.data?.max ?? 5

  const submit = async () => {
    try {
      await add.mutateAsync(wallet.trim())
      setWallet('')
      toast.success('Reviewer added. They were notified.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <section aria-labelledby="reviewers-h" className="space-y-3 rounded-lg border border-line bg-paper p-4">
      <div>
        <h3 id="reviewers-h" className="font-display font-semibold">
          Reviewers
        </h3>
        <p className="mt-1 text-sm text-mute">
          People you trust to read submissions and comment on them. They cannot pick winners and nothing is paid through this role. Only you can approve winners on-chain.
        </p>
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {items.map((r) => (
            <li key={r.wallet} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{r.displayName ?? 'Reviewer'}</span>
                <AddressChip address={r.wallet} />
              </span>
              <Button size="sm" variant="ghost" loading={remove.isPending} onClick={() => remove.mutate(r.wallet, { onError: (e) => toast.error(errorMessage(e)) })}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {items.length < max ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="reviewer-wallet" className="sr-only">
            Reviewer wallet address
          </label>
          <Input id="reviewer-wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x… wallet of someone with a BountyFi account" />
          <Button type="button" variant="secondary" loading={add.isPending} disabled={!WALLET.test(wallet.trim())} onClick={() => void submit()}>
            Add reviewer
          </Button>
        </div>
      ) : (
        <p className="text-sm text-mute">You have added the most reviewers a bounty can have ({max}).</p>
      )}
    </section>
  )
}
