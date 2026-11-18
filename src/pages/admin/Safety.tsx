import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge, Callout } from '@/components/ui/Feedback'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { errorMessage } from '@/lib/api/client'
import { REPORT_REASONS, useAdminReports, useBlockDomain, useBlockedDomains, useResolveReport, useUnblockDomain, type AdminReport, type BlockedDomain } from '@/lib/api/safety'
import { shortAddress } from '@/lib/money'
import { timeAgo } from '@/lib/time'

const LIMIT = 15
const REASON_NAME = Object.fromEntries(REPORT_REASONS) as Record<string, string>

function target(r: AdminReport) {
  if (r.targetType === 'bounty') return <Link className="font-medium underline underline-offset-2" to={`/bounty/${r.targetId}`}>Bounty #{r.targetId}</Link>
  if (r.targetType === 'project') return <Link className="font-medium underline underline-offset-2" to={`/projects/${r.targetId}`}>Project {r.targetId}</Link>
  if (r.targetType === 'profile') return <Link className="num font-medium underline underline-offset-2" to={`/u/${r.targetId}`}>{shortAddress(r.targetId)}</Link>
  return <span className="num text-xs">Submission {r.targetId.slice(0, 8)}</span>
}

/** The report queue. The most reported targets come first. Resolving a report records the outcome and tells the reporter. */
export function Reports() {
  const [status, setStatus] = useState('open')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<AdminReport | null>(null)
  const [note, setNote] = useState('')
  const query = useAdminReports({ status, offset, limit: LIMIT })
  const resolve = useResolveReport()

  const done = async (outcome: 'actioned' | 'dismissed') => {
    if (!selected) return
    try {
      await resolve.mutateAsync({ id: selected.id, status: outcome, note: note.trim() })
      toast.success(outcome === 'actioned' ? 'Marked as acted on.' : 'Dismissed.')
      setSelected(null)
      setNote('')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const columns: Column<AdminReport>[] = [
    { header: 'Target', cell: (r) => <div className="space-y-1">{target(r)}<p className="text-xs text-mute">{r.reportsOnTarget} {r.reportsOnTarget === 1 ? 'person' : 'people'} reported it</p></div> },
    { header: 'Reason', cell: (r) => <Badge tone={r.reason === 'scam' || r.reason === 'phishing' ? 'danger' : 'neutral'}>{REASON_NAME[r.reason] ?? r.reason}</Badge> },
    { header: 'What they said', cell: (r) => <p className="max-w-xs text-sm text-mute">{r.details || 'No details'}</p> },
    { header: 'Reporter', cell: (r) => <span className="text-xs">{r.reporterEmail}<span className="block text-mute">{timeAgo(r.createdAt)}</span></span> },
    {
      header: 'Status',
      cell: (r) => (r.status === 'open' ? <Badge tone="warn">Open</Badge> : <span className="text-xs text-mute">{r.status}{r.adminNote ? `: ${r.adminNote}` : ''}</span>),
    },
    { header: 'Action', align: 'right', cell: (r) => (r.status === 'open' ? <Button size="sm" variant="primary" onClick={() => setSelected(r)}>Review</Button> : null) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44">
          <label htmlFor="report-status" className="sr-only">Status</label>
          <Select id="report-status" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0) }}>
            <option value="open">Open</option>
            <option value="actioned">Acted on</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </Select>
        </div>
        <p className="text-sm text-mute">Hiding or rejecting a bounty is done from All bounties. A report on its own changes nothing.</p>
      </div>
      <DataTable
        caption="Reports"
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        loading={query.isPending}
        error={query.isError}
        onRetry={() => void query.refetch()}
        dimmed={query.isPlaceholderData}
        emptyTitle="No reports here"
        emptyHint="When people report a bounty, a submission, a profile or a project, it shows up here."
        page={query.data ? { total: query.data.total, limit: LIMIT, offset, onChange: setOffset } : undefined}
      />
      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Resolve this report"
        description={selected ? `${REASON_NAME[selected.reason] ?? selected.reason}: ${selected.details || 'no details given'}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            <Button loading={resolve.isPending} onClick={() => void done('dismissed')}>Dismiss</Button>
            <Button variant="primary" loading={resolve.isPending} onClick={() => void done('actioned')}>Acted on it</Button>
          </>
        }
      >
        <Field label="Note to the reporter" optional hint="They get this in their notifications.">
          <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Dialog>
    </div>
  )
}

/** Domains that cannot be linked from bounties or submissions. The block covers every subdomain. */
export function Domains() {
  const list = useBlockedDomains()
  const block = useBlockDomain()
  const unblock = useUnblockDomain()
  const [domain, setDomain] = useState('')
  const [reason, setReason] = useState('')

  const add = async () => {
    try {
      await block.mutateAsync({ domain: domain.trim().toLowerCase(), reason: reason.trim() })
      toast.success('Domain blocked.')
      setDomain('')
      setReason('')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const columns: Column<BlockedDomain>[] = [
    { header: 'Domain', cell: (d) => <span className="num font-medium">{d.domain}</span> },
    { header: 'Reason', cell: (d) => <span className="text-sm text-mute">{d.reason || 'No reason given'}</span> },
    { header: 'Added', cell: (d) => <span className="text-xs text-mute">{d.createdBy ?? 'admin'} · {timeAgo(d.createdAt)}</span> },
    {
      header: 'Action',
      align: 'right',
      cell: (d) => (
        <Button size="sm" variant="ghost" icon={<Trash2 size={14} aria-hidden />} loading={unblock.isPending} onClick={() => unblock.mutate(d.domain, { onSuccess: () => toast.success('Unblocked.'), onError: (e) => toast.error(errorMessage(e)) })}>
          Unblock
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <Callout tone="info" title="What this does">
        A blocked domain, and every subdomain of it, is refused in the links of new bounties and submissions. Existing text is not changed. Link shorteners and raw IP addresses are always refused.
      </Callout>
      <div className="grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-card sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <Field label="Domain">
          <Input placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </Field>
        <Field label="Reason" optional>
          <Input placeholder="Phishing page seen in reports" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button variant="primary" loading={block.isPending} disabled={!domain.trim()} onClick={() => void add()}>
          Block domain
        </Button>
      </div>
      <DataTable
        caption="Blocked domains"
        columns={columns}
        rows={list.data}
        rowKey={(d) => d.domain}
        loading={list.isPending}
        error={list.isError}
        onRetry={() => void list.refetch()}
        emptyTitle="No domains are blocked"
        emptyHint="Add one when reports point at a harmful site."
      />
    </div>
  )
}
