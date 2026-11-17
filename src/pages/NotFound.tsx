import { NotFoundScene } from '@/components/art/Scenes'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="grid items-center gap-10 py-6 md:grid-cols-2 md:gap-16 md:py-12">
      <div className="space-y-5">
        <h1 className="page-title text-4xl sm:text-5xl">There is nothing at this address.</h1>
        <p className="max-w-md text-mute">The page may have moved, or the link may be mistyped.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/explore" variant="primary" size="lg">
            Browse bounties
          </ButtonLink>
          <ButtonLink to="/" size="lg">
            Go to the home page
          </ButtonLink>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-ink shadow-retro">
        <NotFoundScene />
      </div>
    </div>
  )
}
