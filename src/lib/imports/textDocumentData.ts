import type { HtmlToTextOptions } from 'html-to-text'
import type { DocumentData } from '@/types/types'
import { Defuddle } from 'defuddle/node'
import { htmlToText } from 'html-to-text'
import { parseHTML } from 'linkedom'
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

export type BuiltDocumentData = {
  data: DocumentData
  warnings: string[]
}

async function extractMainContentHtml(html: string): Promise<string> {
  try {
    const { document } = parseHTML(html)
    const result = await Defuddle(document, undefined, { useAsync: false })
    return result.content ?? ''
  } catch {
    return ''
  }
}

export async function buildTextDocumentData(fileName: string, content: string): Promise<BuiltDocumentData> {
  const warnings: string[] = []
  let value = content
  if (isHtmlFileName(fileName)) {
    const extractedText = stripHtml(await extractMainContentHtml(content))
    if (extractedText !== '') {
      value = extractedText
    } else {
      value = stripHtml(content)
      warnings.push(`Could not extract the main content of "${fileName}"; imported the full page.`)
    }
  }
  const title = documentTitleFromFileName(fileName)

  return {
    data: {
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
    },
    warnings,
  }
}
