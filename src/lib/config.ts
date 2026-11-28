export const APP_NAME = process.env.APP_NAME || 'STAR-Q'

export const APP_GITHUB_URL = 'https://github.com/ecladatta/star-q'

export const RDF_NAMESPACE_BASE = process.env.RDF_NAMESPACE_BASE || 'https://ecladatta.eurecom.fr'

function httpUrlFromEnv(raw: string | undefined, name: string): string {
  if (!raw)
    return ''
  const parsed = URL.parse(raw)
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:'))
    throw new Error(`${name} must be an absolute http(s) URL, got "${raw}"`)
  return raw
}

export const PRIVACY_URL = httpUrlFromEnv(process.env.PRIVACY_URL, 'PRIVACY_URL')

function bytesFromEnv(raw: string | undefined, fallback: number, name: string): number {
  if (!raw)
    return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer (bytes), got "${raw}"`)
  }
  return parsed
}

export const MAX_IMPORT_FILE_SIZE_BYTES = bytesFromEnv(
  process.env.MAX_IMPORT_FILE_SIZE_BYTES,
  1024 ** 3,
  'MAX_IMPORT_FILE_SIZE_BYTES',
)

export const MAX_IMPORT_UNCOMPRESSED_BYTES = MAX_IMPORT_FILE_SIZE_BYTES * 5
