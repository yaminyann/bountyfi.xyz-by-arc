import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/Address'
import { Callout } from '@/components/ui/Feedback'
import { VerifiedBadge } from '@/components/ecosystem/Checks'
import { errorMessage } from '@/lib/api/client'
import { useStartVerification, useVerifyProject } from '@/lib/api/safety'

const REPO = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/

/**
 * Lets the owner prove they control the project's GitHub repository, so the project shows a Verified badge. The proof
 * is a small file in the repository that holds a code from BountyFi. Only the owner can do it, and the badge goes away
 * if the repository address changes.
 */
export function ProjectVerification({ slug, githubUrl, verified, verifiedBy, isOwner }: { slug: string; githubUrl: string | null; verified: boolean; verifiedBy: string | null; isOwner: boolean }) {
  const start = useStartVerification(slug)
  const verify = useVerifyProject(slug)
  const repoOk = githubUrl !== null && REPO.test(githubUrl)

  const check = async () => {
    try {
      await verify.mutateAsync()
      toast.success('Verified. The badge now shows on your project and its bounties.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (verified) {
    return (
      <section aria-labelledby="verify-h" className="space-y-3">
        <h2 id="verify-h" className="font-display text-lg font-semibold">
          Verification
        </h2>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <VerifiedBadge by={verifiedBy} /> You proved control of <span className="num font-medium">{verifiedBy?.replace('github:', '')}</span>.
        </p>
        <p className="text-sm text-mute">The badge is removed if you change the GitHub address above, until you verify the new one.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="verify-h" className="space-y-4">
      <div>
        <h2 id="verify-h" className="font-display text-lg font-semibold">
          Get the Verified badge
        </h2>
        <p className="mt-1 max-w-[62ch] text-sm text-mute">
          Prove that you control the project's GitHub repository. Contributors see the badge on your project and on its bounties. It shows who runs the page; it does not judge the work.
        </p>
      </div>
      {!isOwner ? (
        <Callout tone="info">Only the project owner can verify it.</Callout>
      ) : !repoOk ? (
        <Callout tone="warn" title="Add the repository address first">
          Set the GitHub address in the form above in the form <span className="num">https://github.com/owner/repo</span>, then save.
        </Callout>
      ) : (
        <div className="space-y-4">
          <Button variant="secondary" loading={start.isPending} onClick={() => start.mutate(undefined, { onError: (e) => toast.error(errorMessage(e)) })}>
            {start.data ? 'Show my code again' : 'Get my code'}
          </Button>
          {start.data && (
            <div className="space-y-3 rounded-lg border border-line bg-paper p-4 text-sm">
              <p>
                1. In <span className="num font-medium">{start.data.repository}</span>, create a file named <span className="num font-medium">{start.data.file}</span> at the top level of the default branch.
              </p>
              <div className="flex items-center gap-2 rounded-md border border-line bg-surface p-2">
                <code className="num min-w-0 flex-1 break-all text-xs">{start.data.token}</code>
                <CopyButton value={start.data.token} label="Copy" />
              </div>
              <p>2. Put only that code in the file and commit it.</p>
              <p>3. Press the button below. BountyFi reads the file from GitHub and checks the code.</p>
              <Button variant="primary" loading={verify.isPending} onClick={() => void check()}>
                I added the file, verify now
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
