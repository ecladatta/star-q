export function documentTitleFromFileName(fileName: string): string {
  const base = fileName.split('/').pop() ?? fileName
  const withoutExtension = base.replace(/\.[^.]+$/, '')
  return withoutExtension.replace(/[_-]+/g, ' ').trim()
}

export function documentTitleFromUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  const segments = parsed.pathname.split('/').filter(segment => segment !== '')
  const last = segments.at(-1) ?? ''
  if (last === '') {
    return parsed.hostname
  }
  let decoded = last
  try {
    decoded = decodeURIComponent(last)
  } catch {
    decoded = last
  }
  const withoutExtension = decoded.replace(/\.[^.]+$/, '')
  const title = withoutExtension !== '' ? withoutExtension : decoded
  return title.replace(/[-_]+/g, ' ').trim()
}
