import { Buffer } from 'node:buffer'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { validatePassword } from '@/lib/identity'

const SCRYPT_COST = 32768
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 1
const SCRYPT_KEY_LENGTH = 64

function scrypt(password: string, salt: Buffer, keyLength: number, options: { cost: number, blockSize: number, parallelization: number, maxmem: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error)
      } else {
        resolve(derivedKey)
      }
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password)
  const salt = randomBytes(16)
  const digest = await scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  })

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    digest.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, costValue, blockSizeValue, parallelizationValue, saltValue, digestValue] = encoded.split('$')
  if (algorithm !== 'scrypt' || !costValue || !blockSizeValue || !parallelizationValue || !saltValue || !digestValue) {
    throw new Error('Unsupported password hash format.')
  }

  const expected = Buffer.from(digestValue, 'base64url')
  const actual = await scrypt(password, Buffer.from(saltValue, 'base64url'), expected.length, {
    cost: Number(costValue),
    blockSize: Number(blockSizeValue),
    parallelization: Number(parallelizationValue),
    maxmem: 64 * 1024 * 1024,
  })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
