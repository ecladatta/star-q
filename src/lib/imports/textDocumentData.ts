import type { DocumentData } from '@/types/types'
import { htmlToText } from 'html-to-text'

export function documentTitleFromFileName(fileName: string): string {
  const base = fileName.split('/').pop() ?? fileName
  const withoutExtension = base.replace(/\.[^.]+$/, '')
  return withoutExtension.replace(/[_-]+/g, ' ').trim()
}

export function isHtmlFileName(fileName: string): boolean {
  return /\.html?$/i.test(fileName)
}

export function stripHtml(content: string): string {
  return htmlToText(content, { wordwrap: false }).trim()
}

export function buildTextDocumentData(fileName: string, content: string): DocumentData {
  const value = isHtmlFileName(fileName) ? stripHtml(content) : content
  const title = documentTitleFromFileName(fileName)

  return {
    _source: {
      identificationMetadata: {
        id: fileName,
        title,
        versionDate: new Date().toISOString(),
        hash: fileName,
        wikidata: '',
        url: [],
      },
      extractionMetadata: [{
        technology: 'text',
        texts: [{
          startOffset: 0,
          endOffset: value.length,
          value,
        }],
        tables: [],
      }],
    },
  }
}
