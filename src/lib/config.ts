export const APP_NAME = process.env.APP_NAME || 'STAR-Q'

export const RDF_NAMESPACE_BASE = process.env.RDF_NAMESPACE_BASE || 'https://ecladatta.eurecom.fr'

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
