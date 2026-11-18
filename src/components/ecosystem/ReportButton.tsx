import { useState } from 'react'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Select, Textarea } from '@/components/ui/Form'
import { errorMessage } from '@/lib/api/client'
import { REPORT_REASONS, useReport, type ReportReason, type ReportTarget } from '@/lib/api/safety'
import { useAuth } from '@/contexts/AuthContext'

/** A quiet link that opens a short report form. A report goes to admins; it never hides anything by itself. */
export function ReportButton({ targetType, targetId, label = 'Report', className }: { targetType: ReportTarget; targetId: string; label?: string; className?: string }) {
  const { user, signIn } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('scam')
  const [details, setDetails] = useState('')
  const report = useReport()

  const send = async () => {
    try {
      const result = await report.mutateAsync({ targetType, targetId, reason, details: details.trim() })
      toast.success(result.alreadyReported ? 'You already reported this. Admins have it.' : 'Thanks. An admin will look at it.')
      setOpen(false)
      setDetails('')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : void signIn())}
        className={className ?? 'inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-mute transition-colors hover:bg-ink/5 hover:text-ink'}
      >
        <Flag size={13} aria-hidden /> {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Report a problem"
        description="Tell admins what is wrong. Reports are read by people, and a report alone does not remove anything."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={report.isPending} onClick={() => void send()}>
              Send report
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="What is it?">
            <Select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
              {REPORT_REASONS.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What happened?" optional hint="Say what you saw, such as a request to pay a fee or a link that asks for your wallet. Up to 1000 characters.">
            <Textarea rows={4} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </>
  )
}
