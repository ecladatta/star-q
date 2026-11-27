import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { MAX_IMPORT_FILE_SIZE_BYTES } from '@/lib/config'
import { isHtmlMediaType } from './urlImportDetection'

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 5

const CHALLENGE_MESSAGE = 'The site blocked the request with a bot-protection challenge. Save the page as a file and import it instead.'

export type FetchedResource = {
  url: string
  mediaType: string
  text: string
  bytes: ArrayBuffer
}

export type FetchResourceOptions = {
  acceptedMediaTypes: string[]
  wikiFallback: boolean
}

export function parseImportUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('The URL is not valid.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.')
  }
  if (url.username !== '' || url.password !== '') {
    throw new Error('URLs with embedded credentials are not allowed.')
  }
  if (url.hostname === '') {
    throw new Error('The URL has no host name.')
  }
  return url
}

const IPV4_BLOCKED_RANGES: [number, number][] = [
  [0, 8],
  [10 * 2 ** 24, 8],
  [100 * 2 ** 24 + 64 * 2 ** 16, 10],
  [127 * 2 ** 24, 8],
  [169 * 2 ** 24 + 254 * 2 ** 16, 16],
  [172 * 2 ** 24 + 16 * 2 ** 16, 12],
  [192 * 2 ** 24, 24],
  [192 * 2 ** 24 + 168 * 2 ** 16, 16],
  [198 * 2 ** 24 + 18 * 2 ** 16, 15],
  [224 * 2 ** 24, 4],
  [240 * 2 ** 24, 4],
]

type Ipv6BlockedRange = {
  network: bigint
  prefix: number
  recurseIpv4?: boolean
}

const IPV6_BLOCKED_RANGES: Ipv6BlockedRange[] = [
  { network: BigInt(0), prefix: 128 },
  { network: BigInt(1), prefix: 128 },
  { network: BigInt(0xFC00) << BigInt(112), prefix: 7 },
  { network: BigInt(0xFE80) << BigInt(112), prefix: 10 },
  { network: BigInt(0xFF00) << BigInt(112), prefix: 8 },
  { network: BigInt(0xFFFF), prefix: 96, recurseIpv4: true },
  { network: BigInt(0x64FF9B) << BigInt(64), prefix: 96, recurseIpv4: true },
]

function parseIpv4(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return null
  }
  let value = 0
  for (const part of parts) {
    const octet = Number(part)
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null
    }
    value = value * 256 + octet
  }
  return value
}

function isBlockedIpv4Value(value: number): boolean {
  return IPV4_BLOCKED_RANGES.some(([network, prefix]) => (value >>> (32 - prefix)) === (network >>> (32 - prefix)))
}

function parseIpv6(ip: string): bigint | null {
  let rest = ip
  let v4Value = BigInt(0)
  let hasV4 = false
  const v4Match = /^(.+?:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip)
  if (v4Match) {
    hasV4 = true
    const value = parseIpv4(v4Match[2])
    if (value === null) {
      return null
    }
    v4Value = BigInt(value)
    rest = `${v4Match[1]}0:0`
  }

  const halves = rest.split('::')
  if (halves.length > 2) {
    return null
  }
  const parseGroups = (part: string): number[] | null => {
    if (part === '') {
      return []
    }
    const groups = part.split(':')
    for (const group of groups) {
      if (!/^[0-9a-f]{1,4}$/i.test(group)) {
        return null
      }
    }
    return groups.map(group => Number.parseInt(group, 16))
  }
  const head = parseGroups(halves[0])
  const tail = halves.length === 2 ? parseGroups(halves[1]) : []
  if (head === null || tail === null) {
    return null
  }
  const groupCount = head.length + tail.length
  if (halves.length === 2 ? groupCount > 7 : groupCount !== 8) {
    return null
  }
  const middle = Array.from<number>({ length: 8 - groupCount }).fill(0)
  const groups = [...head, ...middle, ...tail]

  let value = BigInt(0)
  for (const group of groups) {
    value = (value << BigInt(16)) | BigInt(group)
  }
  if (hasV4) {
    value = (value >> BigInt(32) << BigInt(32)) | v4Value
  }
  return value
}

export function isPublicIp(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) {
    const value = parseIpv4(ip)
    return value !== null && !isBlockedIpv4Value(value)
  }
  if (family === 6) {
    return isPublicIpv6(ip)
  }
  return false
}

function isPublicIpv6(ip: string): boolean {
  const value = parseIpv6(ip)
  if (value === null) {
    return false
  }
  for (const range of IPV6_BLOCKED_RANGES) {
    if (range.recurseIpv4) {
      if ((value >> BigInt(32)) === range.network) {
        return !isBlockedIpv4Value(Number(value & BigInt(0xFFFFFFFF)))
      }
    } else {
      const shift = BigInt(128 - range.prefix)
      if ((value >> shift) === (range.network >> shift)) {
        return false
      }
    }
  }
  return true
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause
    return cause instanceof Error && cause.message !== '' ? cause.message : error.message
  }
  return String(error)
}

function sizeLimitMessage(): string {
  return `The page exceeds the import size limit of ${MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
}

async function assertHostIsPublic(url: URL): Promise<void> {
  const hostname = url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname
  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new Error('Could not resolve the URL host.')
  }
  if (addresses.length === 0 || addresses.some(entry => !isPublicIp(entry.address))) {
    throw new Error('The URL points to a private or local address, which is not allowed.')
  }
}

async function fetchHop(url: URL, controller: AbortController): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'manual',
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`Could not fetch the URL: ${describeError(error)}`)
  }
}

function resolveRedirect(location: string, current: URL): string {
  try {
    return new URL(location, current).toString()
  } catch {
    throw new Error('The page returned an invalid redirect location.')
  }
}

function isChallengeResponse(response: Response): boolean {
  return (response.headers.get('cf-mitigated') ?? '').toLowerCase() === 'challenge'
}

function wikiRestUrlFor(url: URL): string | null {
  const prefix = '/wiki/'
  if (!url.pathname.startsWith(prefix) || url.pathname.length === prefix.length) {
    return null
  }
  return `${url.origin}/rest.php/v1/page/${url.pathname.slice(prefix.length)}/html`
}

async function readResourceBody(
  response: Response,
  controller: AbortController,
  acceptedMediaTypes: string[],
  finalUrl: string,
): Promise<FetchedResource> {
  const contentType = response.headers.get('content-type') ?? ''
  const parameters = contentType.toLowerCase().split(';').map(part => part.trim())
  const mediaType = parameters.shift() ?? ''

  if (mediaType !== '' && !acceptedMediaTypes.includes(mediaType)) {
    throw new Error(`The URL returned content type "${contentType}", which is not supported.`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength !== null && Number(contentLength) > MAX_IMPORT_FILE_SIZE_BYTES) {
    controller.abort()
    throw new Error(sizeLimitMessage())
  }

  if (response.body === null) {
    return { url: finalUrl, mediaType, text: '', bytes: new ArrayBuffer(0) }
  }

  const chunks: Uint8Array[] = []
  let total = 0
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    total += value.byteLength
    if (total > MAX_IMPORT_FILE_SIZE_BYTES) {
      controller.abort()
      throw new Error(sizeLimitMessage())
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return { url: finalUrl, mediaType, text: decodeBytes(bytes, parameters), bytes: bytes.buffer as ArrayBuffer }
}

function decodeBytes(bytes: Uint8Array, parameters: string[]): string {
  let charset = 'utf-8'
  for (const parameter of parameters) {
    const separator = parameter.indexOf('=')
    if (separator === -1 || parameter.slice(0, separator) !== 'charset') {
      continue
    }
    charset = parameter.slice(separator + 1).trim().replace(/^"|"/g, '')
  }
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

async function fetchFollowingRedirects(startUrl: string, controller: AbortController): Promise<{ response: Response, url: URL }> {
  let url = startUrl
  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      throw new Error('Too many redirects.')
    }
    const current = parseImportUrl(url)
    await assertHostIsPublic(current)
    const response = await fetchHop(current, controller)

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location === null) {
        throw new Error('The page returned a redirect without a location.')
      }
      url = resolveRedirect(location, current)
      continue
    }
    return { response, url: current }
  }
}

export async function fetchResourceFromUrl(rawUrl: string, options: FetchResourceOptions): Promise<FetchedResource> {
  const controller = new AbortController()
  let timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const restartTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  }
  try {
    const original = parseImportUrl(rawUrl)
    const { response, url: finalUrl } = await fetchFollowingRedirects(original.toString(), controller)

    if (response.status < 200 || response.status >= 300) {
      if (isChallengeResponse(response)) {
        if (options.wikiFallback) {
          const restUrl = wikiRestUrlFor(original)
          if (restUrl !== null) {
            restartTimer()
            return await fetchViaRestFallback(restUrl, original.toString(), controller, options.acceptedMediaTypes)
          }
        }
        throw new Error(CHALLENGE_MESSAGE)
      }
      throw new Error(`The page returned HTTP ${response.status}.`)
    }

    return await readResourceBody(response, controller, options.acceptedMediaTypes, finalUrl.toString())
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`The page took too long to fetch (timed out after ${FETCH_TIMEOUT_MS / 1000} seconds).`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function fetchViaRestFallback(
  restUrl: string,
  originalUrl: string,
  controller: AbortController,
  acceptedMediaTypes: string[],
): Promise<FetchedResource> {
  try {
    const { response } = await fetchFollowingRedirects(restUrl, controller)
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`The page returned HTTP ${response.status}.`)
    }
    const resource = await readResourceBody(response, controller, acceptedMediaTypes, originalUrl)
    if (!isHtmlMediaType(resource.mediaType)) {
      throw new Error('The MediaWiki REST fallback did not return HTML.')
    }
    return resource
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(CHALLENGE_MESSAGE)
  }
}
