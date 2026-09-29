import { describe, expect, it } from 'vitest'
import { parseNumericSpan, passesNumericUnitGate } from './numeric-units'

describe('parseNumericSpan', () => {
  it('parses a bare number with no unit word', () => {
    expect(parseNumericSpan('12')).toEqual({ amount: '12', unitWord: null })
  })

  it('parses a signed decimal', () => {
    expect(parseNumericSpan('+3.5')).toEqual({ amount: '+3.5', unitWord: null })
  })

  it('parses a number with a trailing unit word', () => {
    expect(parseNumericSpan('12 metres')).toEqual({ amount: '12', unitWord: 'metres' })
  })

  it('parses a short unit word', () => {
    expect(parseNumericSpan('12 m')).toEqual({ amount: '12', unitWord: 'm' })
  })

  it('parses an exponent with a unit word', () => {
    expect(parseNumericSpan('3.5e2 km')).toEqual({ amount: '3.5e2', unitWord: 'km' })
  })

  it('parses a leading-dot decimal', () => {
    expect(parseNumericSpan('.5 mol')).toEqual({ amount: '.5', unitWord: 'mol' })
  })

  it('rejects prose numbers', () => {
    expect(parseNumericSpan('twelve metres')).toBeNull()
  })

  it('rejects a leading word before the number', () => {
    expect(parseNumericSpan('about 12 metres')).toBeNull()
  })

  it('rejects a range', () => {
    expect(parseNumericSpan('12 to 15 metres')).toBeNull()
  })

  it('rejects a compound expression', () => {
    expect(parseNumericSpan('1 m 50')).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(parseNumericSpan('')).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    expect(parseNumericSpan('  12 kg  ')).toEqual({ amount: '12', unitWord: 'kg' })
  })
})

describe('passesNumericUnitGate', () => {
  it('passes when the span starts with a number', () => {
    expect(passesNumericUnitGate('12 metres', null)).toBe(true)
  })

  it('passes for a signed decimal start', () => {
    expect(passesNumericUnitGate('-3.5e2', null)).toBe(true)
  })

  it('passes when the datatype is numeric even for prose', () => {
    expect(passesNumericUnitGate('twelve metres', { entityDatatype: 'integer' })).toBe(true)
  })

  it('fails for prose with a non-numeric datatype', () => {
    expect(passesNumericUnitGate('about 12 metres', { entityDatatype: 'string' })).toBe(false)
  })

  it('fails for prose with no datatype', () => {
    expect(passesNumericUnitGate('twelve metres', null)).toBe(false)
  })
})
