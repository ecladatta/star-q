// Leading numeric token: optional sign, digits with optional decimal part or a
// leading-dot decimal, optional exponent.
const NUMERIC_PREFIX = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i

const ONE_TRAILING_WORD = /^\s+(\S+)$/

const NUMERIC_SOURCE = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?'

// `12 to 15 metres`, `12-15 metres`, `12–15 metres`: two numbers separated by
// "to" or a dash, with an optional trailing unit word.
const QUANTITY_RANGE = new RegExp(
  `^(${NUMERIC_SOURCE})\\s*(?:to|[-–])\\s*(${NUMERIC_SOURCE})(?:\\s+(\\S+))?$`,
  'i',
)

export type NumericSpanParse = {
  amount: string
  unitWord: string | null
}

// Bounded parser: a leading signed decimal with optional exponent followed by
// at most one trailing unit word. Anything else (prose, ranges, mixed
// expressions) returns null so the picker opens empty with no guess.
export function parseNumericSpan(text: string): NumericSpanParse | null {
  const trimmed = text.trim()
  const prefix = NUMERIC_PREFIX.exec(trimmed)?.[0]
  if (!prefix) {
    return null
  }

  const rest = trimmed.slice(prefix.length)
  if (rest === '') {
    return { amount: prefix, unitWord: null }
  }

  const unitWord = ONE_TRAILING_WORD.exec(rest)?.[1]
  return unitWord ? { amount: prefix, unitWord } : null
}

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

// Best-effort prefill for the quantity editor, strictly bounded so it never
// guesses: a leading numeric token becomes the amount, a `<num> to <num>`
// (or dash) range becomes the bounds with the first number as the amount, and
// a trailing word becomes the unit suggestion. The trailing-word rule only
// fires on exactly two words so a hedged or compound phrase like "about 12
// metres" or "1 m 50" yields nothing at all.
export function parseQuantityHint(text: string): QuantityHint {
  const trimmed = text.trim()
  if (!trimmed) {
    return NO_QUANTITY_HINT
  }

  const range = QUANTITY_RANGE.exec(trimmed)
  if (range) {
    const [, lower, upper, unitWord] = range
    return { amount: lower, unitWord: unitWord ?? null, lowerBound: lower, upperBound: upper }
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

// Full-string signed decimal with optional exponent, mirroring the
// NUMERIC_PREFIX semantics anchored at both ends.
export function isValidQuantityAmount(value: string): boolean {
  return FULL_NUMERIC.test(value.trim())
}
