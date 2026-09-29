import type { DocumentAnnotationComponent } from '@/types/types'
import { isNumericEntityDatatype } from '@/lib/datatypes'

// Leading numeric token: optional sign, digits with optional decimal part or a
// leading-dot decimal, optional exponent.
const NUMERIC_PREFIX = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i

const ONE_TRAILING_WORD = /^\s+(\S+)$/

export type NumericSpanParse = {
  amount: string
  unitWord: string | null
}

// The unit gate: the span starts with a number, or the component already has a
// numeric datatype. Never satisfied by entity links — callers exclude those.
export function passesNumericUnitGate(
  text: string,
  component: Pick<DocumentAnnotationComponent, 'entityDatatype'> | null | undefined,
): boolean {
  return NUMERIC_PREFIX.test(text.trim()) || isNumericEntityDatatype(component?.entityDatatype)
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
