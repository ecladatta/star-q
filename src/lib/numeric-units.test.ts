import { describe, expect, it } from 'vitest'
import {
  isValidQuantityAmount,
  parseNumericSpan,
  parseQuantityHint,
} from './numeric-units'

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

describe('parseQuantityHint', () => {
  it('parses a leading number with a trailing unit word', () => {
    expect(parseQuantityHint('12 meters')).toEqual({
      amount: '12',
      unitWord: 'meters',
      lowerBound: null,
      upperBound: null,
    })
  })

  it('suggests the trailing word for a spelled-out number', () => {
    expect(parseQuantityHint('twelve meters')).toEqual({
      amount: null,
      unitWord: 'meters',
      lowerBound: null,
      upperBound: null,
    })
  })

  it('parses a range written with "to"', () => {
    expect(parseQuantityHint('12 to 15 meters')).toEqual({
      amount: '12',
      unitWord: 'meters',
      lowerBound: '12',
      upperBound: '15',
    })
  })

  it('parses a range written with dashes', () => {
    expect(parseQuantityHint('12-15 meters')).toEqual({
      amount: '12',
      unitWord: 'meters',
      lowerBound: '12',
      upperBound: '15',
    })
    expect(parseQuantityHint('12 – 15')).toEqual({
      amount: '12',
      unitWord: null,
      lowerBound: '12',
      upperBound: '15',
    })
  })

  it('parses a bare number with no unit word', () => {
    expect(parseQuantityHint('12')).toEqual({
      amount: '12',
      unitWord: null,
      lowerBound: null,
      upperBound: null,
    })
  })

  it('yields nothing for a hedged phrase', () => {
    expect(parseQuantityHint('about 12 meters')).toEqual({
      amount: null,
      unitWord: null,
      lowerBound: null,
      upperBound: null,
    })
  })

  it('parses an exponent amount with a unit word', () => {
    expect(parseQuantityHint('1.5e2 km')).toEqual({
      amount: '1.5e2',
      unitWord: 'km',
      lowerBound: null,
      upperBound: null,
    })
  })

  it('suggests the trailing word of any two-word span, prose included', () => {
    expect(parseQuantityHint('the government')).toEqual({
      amount: null,
      unitWord: 'government',
      lowerBound: null,
      upperBound: null,
    })
    expect(parseQuantityHint('')).toEqual({
      amount: null,
      unitWord: null,
      lowerBound: null,
      upperBound: null,
    })
  })

  it('does not guess on compound expressions', () => {
    expect(parseQuantityHint('1 m 50')).toEqual({
      amount: null,
      unitWord: null,
      lowerBound: null,
      upperBound: null,
    })
  })
})

describe('isValidQuantityAmount', () => {
  it('accepts signed decimals with optional exponents', () => {
    expect(isValidQuantityAmount('12')).toBe(true)
    expect(isValidQuantityAmount('-3.5')).toBe(true)
    expect(isValidQuantityAmount('.5')).toBe(true)
    expect(isValidQuantityAmount('1.5e2')).toBe(true)
    expect(isValidQuantityAmount(' 12 ')).toBe(true)
  })

  it('rejects anything that is not a plain decimal', () => {
    expect(isValidQuantityAmount('')).toBe(false)
    expect(isValidQuantityAmount('twelve')).toBe(false)
    expect(isValidQuantityAmount('12 metres')).toBe(false)
    expect(isValidQuantityAmount('1.2.3')).toBe(false)
  })
})
