import { describe, expect, it } from 'vitest'
import { isPublicIp, parseImportUrl } from './urlPageFetch'

describe('parseImportUrl', () => {
  it('accepts http and https URLs', () => {
    expect(parseImportUrl('https://example.com/article').protocol).toBe('https:')
    expect(parseImportUrl('http://example.com/').protocol).toBe('http:')
  })

  it('rejects non-http protocols', () => {
    expect(() => parseImportUrl('ftp://example.com/file.txt')).toThrow()
    expect(() => parseImportUrl('file:///etc/passwd')).toThrow()
  })

  it('rejects embedded credentials', () => {
    expect(() => parseImportUrl('https://user:pass@example.com/')).toThrow()
    expect(() => parseImportUrl('https://user@example.com/')).toThrow()
  })

  it('rejects URLs without a host', () => {
    expect(() => parseImportUrl('https://')).toThrow()
  })

  it('rejects garbage input', () => {
    expect(() => parseImportUrl('not a url')).toThrow()
  })
})

describe('isPublicIp', () => {
  it.each([
    '0.1.2.3',
    '10.0.0.1',
    '100.64.0.1',
    '100.127.255.255',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.19.255.255',
    '224.0.0.1',
    '239.255.255.255',
    '240.0.0.1',
    '255.255.255.255',
  ])('blocks the IPv4 address %s', (ip) => {
    expect(isPublicIp(ip)).toBe(false)
  })

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '9.9.9.9',
    '100.128.0.1',
    '172.32.0.1',
    '192.0.1.1',
    '192.167.0.1',
    '198.20.0.1',
  ])('allows the IPv4 address %s', (ip) => {
    expect(isPublicIp(ip)).toBe(true)
  })

  it.each([
    '::',
    '::1',
    'fc00::1',
    'fd00::1',
    'fe80::1',
    'febf::1',
    'ff02::1',
    'ffff::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '64:ff9b::192.168.0.1',
  ])('blocks the IPv6 address %s', (ip) => {
    expect(isPublicIp(ip)).toBe(false)
  })

  it.each([
    '2606:4700::1111',
    '2a00:1450:4001:81::200e',
    '::ffff:8.8.8.8',
    '64:ff9b::8.8.8.8',
  ])('allows the IPv6 address %s', (ip) => {
    expect(isPublicIp(ip)).toBe(true)
  })
})
