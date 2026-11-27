import { APP_GITHUB_URL } from '@/lib/config'

export function OpenSourceTagline() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {'This instance runs '}
      <a
        href={APP_GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        STAR-Q
      </a>
      , a free and open source annotation tool.
    </p>
  )
}
