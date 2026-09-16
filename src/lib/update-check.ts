import pkg from '../../package.json'

const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/ecladatta/star-q/releases/latest'
const REVALIDATE_SECONDS = 3600

export type UpdateInfo = {
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
  releaseUrl: string | null
}

type ParsedVersion = { major: number, minor: number, patch: number }

type GithubLatestRelease = {
  tag_name?: unknown
  html_url?: unknown
}

export function parseVersion(value: string): ParsedVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())
  if (!match) {
    return null
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) {
    return 0
  }
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (left[key] !== right[key]) {
      return left[key] < right[key] ? -1 : 1
    }
  }
  return 0
}

export async function getUpdateInfo(): Promise<UpdateInfo> {
  const currentVersion = pkg.version
  let latest: GithubLatestRelease | null = null
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (response.ok) {
      latest = (await response.json()) as GithubLatestRelease
    }
  } catch {
    latest = null
  }

  const tag = typeof latest?.tag_name === 'string' ? latest.tag_name : null
  const releaseUrl = typeof latest?.html_url === 'string' ? latest.html_url : null
  const latestVersion = tag !== null && parseVersion(tag) !== null ? tag.replace(/^v/, '') : null
  const updateAvailable = latestVersion !== null
    && releaseUrl !== null
    && compareVersions(currentVersion, latestVersion) < 0

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    releaseUrl: updateAvailable ? releaseUrl : null,
  }
}
