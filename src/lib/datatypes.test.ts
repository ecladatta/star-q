import { describe, expect, it } from 'vitest'
import {
  isEntityDatatype,
  normalizeDatatype,
  normalizeLexicalValue,
} from './datatypes'

describe('normalizeDatatype', () => {
  it('maps legacy aliases to canonical datatypes', () => {
    expect(normalizeDatatype('url')).toBe('anyURI')
    expect(normalizeDatatype('datetime')).toBe('dateTime')
    expect(normalizeDatatype('year')).toBe('gYear')
    expect(normalizeDatatype('month')).toBe('gMonth')
    expect(normalizeDatatype('day')).toBe('gDay')
  })

  it('passes canonical datatypes through unchanged', () => {
    expect(normalizeDatatype('string')).toBe('string')
    expect(normalizeDatatype('integer')).toBe('integer')
    expect(normalizeDatatype('dateTimeStamp')).toBe('dateTimeStamp')
  })

  it('returns null for unknown values', () => {
    expect(normalizeDatatype('not-a-datatype')).toBeNull()
    expect(normalizeDatatype('')).toBeNull()
  })
})

describe('isEntityDatatype', () => {
  it('accepts only values from the canonical datatype list', () => {
    expect(isEntityDatatype('string')).toBe(true)
    expect(isEntityDatatype('gYearMonth')).toBe(true)
    expect(isEntityDatatype('url')).toBe(false)
    expect(isEntityDatatype('nonsense')).toBe(false)
  })
})

describe('normalizeLexicalValue', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeLexicalValue('  hello  ', 'string')).toBe('hello')
  })

  it('normalizes boolean values case-insensitively', () => {
    expect(normalizeLexicalValue(' TRUE ', 'boolean')).toBe('true')
    expect(normalizeLexicalValue('False', 'boolean')).toBe('false')
    expect(normalizeLexicalValue('1', 'boolean')).toBe('1')
    expect(normalizeLexicalValue('0', 'boolean')).toBe('0')
  })

  it('passes unrecognized booleans through', () => {
    expect(normalizeLexicalValue('yes', 'boolean')).toBe('yes')
  })

  it('pads gMonth values', () => {
    expect(normalizeLexicalValue('5', 'gMonth')).toBe('--05')
    expect(normalizeLexicalValue('12', 'gMonth')).toBe('--12')
  })

  it('pads gDay values', () => {
    expect(normalizeLexicalValue('3', 'gDay')).toBe('---03')
    expect(normalizeLexicalValue('31', 'gDay')).toBe('---31')
  })

  it('pads gYearMonth values', () => {
    expect(normalizeLexicalValue('1967-1', 'gYearMonth')).toBe('1967-01')
    expect(normalizeLexicalValue('1967-12', 'gYearMonth')).toBe('1967-12')
  })

  it('pads gMonthDay values', () => {
    expect(normalizeLexicalValue('1-15', 'gMonthDay')).toBe('--01-15')
    expect(normalizeLexicalValue('12-31', 'gMonthDay')).toBe('--12-31')
  })

  it('leaves non-matching shapes trimmed but unchanged', () => {
    expect(normalizeLexicalValue('1967-13', 'gYearMonth')).toBe('1967-13')
    expect(normalizeLexicalValue('hello', 'gYear')).toBe('hello')
  })
})
