import type { HtmlToTextOptions } from 'html-to-text'
import type { DocumentData } from '@/types/types'
import { htmlToText } from 'html-to-text'
import { documentTitleFromFileName } from './documentTitle'

export function isHtmlFileName(fileName: string): boolean {
  return /\.html?$/i.test(fileName)
}

const HTML_TO_TEXT_OPTIONS: HtmlToTextOptions = {
  wordwrap: false,
  selectors: [
    { selector: 'h1', format: 'heading', options: { uppercase: false } },
    { selector: 'h2', format: 'heading', options: { uppercase: false } },
    { selector: 'h3', format: 'heading', options: { uppercase: false } },
    { selector: 'h4', format: 'heading', options: { uppercase: false } },
    { selector: 'h5', format: 'heading', options: { uppercase: false } },
    { selector: 'h6', format: 'heading', options: { uppercase: false } },
  ],
}

export function stripHtml(content: string): string {
  return htmlToText(content, HTML_TO_TEXT_OPTIONS).trim()
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
