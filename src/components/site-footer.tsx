import { GithubMark } from '@/components/github-mark'
import { APP_GITHUB_URL, PRIVACY_URL } from '@/lib/config'

export function SiteFooter() {
  return (
    <footer className="flex justify-center py-4">
      <p className="text-sm text-muted-foreground">
        <a href={APP_GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
          <GithubMark className="size-4" />
          GitHub
        </a>
        {PRIVACY_URL
          ? (
              <>
                {' · '}
                <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  Privacy
                </a>
              </>
            )
          : null}
      </p>
    </footer>
  )
}
