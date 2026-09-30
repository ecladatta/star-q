const NUMERIC_PREFIX = /^[+-]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i

const ONE_TRAILING_WORD = /^\s+(\S+)$/

const NUMERIC_SOURCE = '[+-]?(?:\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?'

const QUANTITY_RANGE = new RegExp(
  `^(${NUMERIC_SOURCE})\\s*(?:to|[-–])\\s*(${NUMERIC_SOURCE})(?:\\s+(\\S+))?$`,
  'i',
)

export type NumericSpanParse = {
  amount: string
  unitWord: string | null
}

export function parseNumericSpan(text: string): NumericSpanParse | null {
  const trimmed = text.trim()
  const prefix = NUMERIC_PREFIX.exec(trimmed)?.[0]
  if (!prefix) {
    return null
  }

  const amount = normalizeQuantityAmount(prefix)
  const rest = trimmed.slice(prefix.length)
  if (rest === '') {
    return { amount, unitWord: null }
  }

  const unitWord = ONE_TRAILING_WORD.exec(rest)?.[1]
  return unitWord ? { amount, unitWord } : null
}

export function normalizeQuantityAmount(value: string): string {
  return /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(value.trim())
    ? value.trim().replace(/,/g, '')
    : value
}

export const STORED_AMOUNT_PATTERN = '^[+-]?([0-9]+([.][0-9]+)?|[.][0-9]+)([eE][+-]?[0-9]+)?$'

export type QuantityHint = {
  amount: string | null
  unitWord: string | null
  lowerBound: string | null
  upperBound: string | null
}

const NO_QUANTITY_HINT: QuantityHint = {
  amount: null,
  unitWord: null,
  lowerBound: null,
  upperBound: null,
}

export function parseQuantityHint(text: string): QuantityHint {
  const trimmed = text.trim()
  if (!trimmed) {
    return NO_QUANTITY_HINT
  }

  const range = QUANTITY_RANGE.exec(trimmed)
  if (range) {
    const [, lower, upper, unitWord] = range
    const amount = normalizeQuantityAmount(lower)
    return {
      amount,
      unitWord: unitWord ?? null,
      lowerBound: normalizeQuantityAmount(lower),
      upperBound: normalizeQuantityAmount(upper),
    }
  }

  const strict = parseNumericSpan(trimmed)
  if (strict) {
    return { amount: strict.amount, unitWord: strict.unitWord, lowerBound: null, upperBound: null }
  }

  const twoWords = /^\S+\s+(\S+)$/.exec(trimmed)
  if (twoWords) {
    return { ...NO_QUANTITY_HINT, unitWord: twoWords[1] }
  }

  return NO_QUANTITY_HINT
}

const FULL_NUMERIC = new RegExp(`^${NUMERIC_SOURCE}$`, 'i')

export function isValidQuantityAmount(value: string): boolean {
  return FULL_NUMERIC.test(value.trim())
}
