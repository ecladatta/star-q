import { toast } from 'sonner'

export async function downloadExportFile(url: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    const message = await response
      .json()
      .then((body: { error?: string }) => body.error ?? null)
      .catch(() => null)
    toast.error(message ?? 'Export failed. Please try again.')
    return
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? 'export'
  const blobUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = blobUrl
  downloadLink.download = filename
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0)

  const skipped = Number(response.headers.get('X-QuickStatements-Skipped'))
  if (skipped > 0) {
    toast.warning(
      `${skipped} annotation${skipped === 1 ? '' : 's'} skipped. Only Wikibase-linked statements were exported.`,
    )
  }
}
