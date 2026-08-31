export function documentTitleFromFileName(fileName: string): string {
  const base = fileName.split('/').pop() ?? fileName
  const withoutExtension = base.replace(/\.[^.]+$/, '')
  return withoutExtension.replace(/[_-]+/g, ' ').trim()
}
