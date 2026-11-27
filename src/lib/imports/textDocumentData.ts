import type { DefuddleResponse } from 'defuddle/node'
import type { HtmlToTextOptions } from 'html-to-text'
import type { DocumentData } from '@/types/types'
import { Defuddle } from 'defuddle/node'
import { htmlToText } from 'html-to-text'
import { parseHTML } from 'linkedom'
import { documentTitleFromFileName, documentTitleFromUrl } from './documentTitle'

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

async function extractMainContent(html: string, url?: string): Promise<DefuddleResponse | null> {
  try {
    const { document } = parseHTML(html)
    return await Defuddle(document, url, { useAsync: false })
  } catch {
    return null
  }
}

type HtmlExtraction = {
  value: string
  extracted: DefuddleResponse | null
  usedFallback: boolean
}

async function extractHtmlText(html: string, url?: string): Promise<HtmlExtraction> {
  const extracted = await extractMainContent(html, url)
  const value = stripHtml(extracted?.content ?? '')
  if (value !== '') {
    return { value, extracted, usedFallback: false }
  }
  return { value: stripHtml(html), extracted, usedFallback: true }
}

function assembleTextDocumentData(fields: {
  id: string
  title: string
  versionDate: string
  urls: string[]
  value: string
}): DocumentData {
  return {
    _source: {
      identificationMetadata: {
        id: fields.id,
        title: fields.title,
        versionDate: fields.versionDate,
        hash: fields.id,
        wikidata: '',
        url: fields.urls,
      },
      extractionMetadata: [{
        technology: 'text',
        texts: [{
          startOffset: 0,
          endOffset: fields.value.length,
          value: fields.value,
        }],
        tables: [],
      }],
    },
  }
}

export async function buildTextDocumentData(fileName: string, content: string): Promise<BuiltDocumentData> {
  const warnings: string[] = []
  let value = content
  if (isHtmlFileName(fileName)) {
    const extraction = await extractHtmlText(content)
    value = extraction.value
    if (extraction.usedFallback) {
      warnings.push(`Could not extract the main content of "${fileName}"; imported the full page.`)
    }
  }
  const title = documentTitleFromFileName(fileName)

  return {
    data: assembleTextDocumentData({
      id: fileName,
      title,
      versionDate: new Date().toISOString(),
      urls: [],
      value,
    }),
    warnings,
  }
}

export async function buildUrlDocumentData(url: string, content: string, isHtml: boolean, fetchedAt: string): Promise<BuiltDocumentData> {
  const warnings: string[] = []
  let value = content
  let extracted: DefuddleResponse | null = null
  if (isHtml) {
    const extraction = await extractHtmlText(content, url)
    value = extraction.value
    extracted = extraction.extracted
    if (extraction.usedFallback) {
      warnings.push(`Could not extract the main content of ${url}; imported the full page.`)
    }
  }
  const title = extracted?.title ? extracted.title : documentTitleFromUrl(url)
  const versionDate = extracted?.published ? extracted.published : fetchedAt

  return {
    data: assembleTextDocumentData({
      id: url,
      title,
      versionDate,
      urls: [url],
      value,
    }),
    warnings,
  }
}
