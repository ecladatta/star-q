import { toast } from 'sonner'
import { getRawDocumentData } from '@/actions/document/documentActions'

export async function downloadRawDocumentData(id: string, title: string) {
  try {
    const rawData = await getRawDocumentData(id)
    if (!rawData) {
      toast.error('Couldn\'t fetch document data')
      return
    }

    const blob = new Blob([JSON.stringify(rawData, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}_raw.json`
    document.body.appendChild(a)
    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Document data downloaded successfully')
  } catch (error) {
    console.error('Error downloading document data:', error)
    toast.error('Failed to download document data')
  }
}
