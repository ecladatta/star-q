import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password-hash'

describe('local password hashing', () => {
  it('verifies the password without storing it and rejects a different password', async () => {
    const password = 'correct horse battery staple'
    const encoded = await hashPassword(password)

    expect(encoded).not.toContain(password)
    await expect(verifyPassword(password, encoded)).resolves.toBe(true)
    await expect(verifyPassword('different password', encoded)).resolves.toBe(false)
  })

  it('uses a distinct salt for each password hash', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same password value'),
      hashPassword('same password value'),
    ])

    expect(first).not.toBe(second)
  })

  it('fails loudly for an unsupported stored hash', async () => {
    await expect(verifyPassword('a secure password', 'not-a-supported-hash')).rejects.toThrow('Unsupported password hash format')
  })
})
