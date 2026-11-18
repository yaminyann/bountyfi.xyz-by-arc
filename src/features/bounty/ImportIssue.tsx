import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { errorMessage } from '@/lib/api/client'
import { importIssue, type IssueDraft } from '@/lib/api/safety'

const ISSUE = /^https:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+/

/**
 * Starts a bounty from a public GitHub issue. The text is the issue author's, so it only fills fields that are still
 * empty, and the creator reads and edits it before anything is posted.
 */
export function ImportIssue({ disabled, onImport }: { disabled?: boolean; onImport: (issue: IssueDraft) => string[] }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = ISSUE.test(url.trim())

  const run = async () => {
    setBusy(true)
    try {
      const issue = await importIssue(url.trim())
      const filled = onImport(issue)
      toast.success(filled.length > 0 ? `Filled in: ${filled.join(', ')}. Read it and edit before you post.` : 'Nothing to fill in. The fields you already wrote were kept.')
      if (issue.state === 'closed') toast.message('That issue is closed on GitHub.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-paper p-4">
      <label htmlFor="import-issue" className="block text-sm font-medium">
        Start from a GitHub issue <span className="font-normal text-mute">(optional)</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="import-issue" type="url" inputMode="url" disabled={disabled || busy} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo/issues/12" />
        <Button type="button" variant="secondary" loading={busy} disabled={disabled || !valid} onClick={() => void run()}>
          Fill from issue
        </Button>
      </div>
      <p className="text-xs text-mute">BountyFi reads the public issue from github.com. It fills the title, description, link and tags only where they are empty.</p>
    </div>
  )
}
