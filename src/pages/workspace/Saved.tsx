import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { BountyCard, BountyCardSkeleton } from '@/components/bounty/BountyCard'
import { RequireAccount } from '@/components/layout/RequireAccount'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { useSavedBounties } from '@/lib/api/safety'

const PAGE = 24

function Content() {
  const [offset, setOffset] = useState(0)
  const saved = useSavedBounties(offset)

  if (saved.isError) return <ErrorState title="Your saved bounties did not load" onRetry={() => void saved.refetch()} />
  if (saved.isPending) {
    return (
      <ul aria-busy className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <BountyCardSkeleton key={i} />
        ))}
      </ul>
    )
  }
  if (saved.data.items.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Nothing saved yet"
        action={
          <ButtonLink to="/explore" variant="primary">
            Browse open bounties
          </ButtonLink>
        }
      >
        Use the bookmark on a bounty to keep it here. Saved bounties are private to you.
      </EmptyState>
    )
  }
  return (
    <div className="space-y-6">
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {saved.data.items.map((b) => (
          <BountyCard key={b.id} bounty={b} />
        ))}
      </ul>
      <Pagination total={saved.data.total} limit={PAGE} offset={offset} onChange={setOffset} />
    </div>
  )
}

export default function Saved() {
  return (
    <div>
      <PageHeader title="Saved bounties">Bounties you kept to come back to. Only you can see this list.</PageHeader>
      <RequireAccount purpose="see your saved bounties">
        <Content />
      </RequireAccount>
    </div>
  )
}
