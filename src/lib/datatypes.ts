import type { EntityDatatype } from '@/types/types'

/**
 * All RDF-compatible XSD datatypes (https://www.w3.org/TR/rdf11-concepts/#xsd-datatypes),
 * grouped for display. Each value is also the XSD local name, so the datatype
 * IRI is simply `http://www.w3.org/2001/XMLSchema#<value>`.
 */
export const ENTITY_DATATYPE_GROUPS: ReadonlyArray<{
  label: string
  types: readonly EntityDatatype[]
}> = [
  {
    label: 'Core',
    types: ['string', 'boolean', 'decimal', 'integer'],
  },
  {
    label: 'Floating-point numbers',
    types: ['double', 'float'],
  },
  {
    label: 'Date and time',
    types: ['date', 'time', 'dateTime', 'dateTimeStamp'],
  },
  {
    label: 'Recurring dates',
    types: ['gYear', 'gMonth', 'gDay', 'gYearMonth', 'gMonthDay'],
  },
  {
    label: 'Durations',
    types: ['duration', 'yearMonthDuration', 'dayTimeDuration'],
  },
  {
    label: 'Integers',
    types: [
      'byte',
      'short',
      'int',
      'long',
      'unsignedByte',
      'unsignedShort',
      'unsignedInt',
      'unsignedLong',
      'positiveInteger',
      'nonNegativeInteger',
      'negativeInteger',
      'nonPositiveInteger',
    ],
  },
  {
    label: 'Binary data',
    types: ['hexBinary', 'base64Binary'],
  },
  {
    label: 'Other',
    types: [
      'anyURI',
      'language',
      'normalizedString',
      'token',
      'NMTOKEN',
      'Name',
      'NCName',
    ],
  },
]

export const ENTITY_DATATYPES: readonly EntityDatatype[]
  = ENTITY_DATATYPE_GROUPS.flatMap(group => group.types)

export const ENTITY_DATATYPE_LABELS: Record<EntityDatatype, string> = {
  string: 'String',
  boolean: 'Boolean',
  decimal: 'Decimal',
  integer: 'Integer',
  double: 'Double',
  float: 'Float',
  date: 'Date',
  time: 'Time',
  dateTime: 'Date time',
  dateTimeStamp: 'Date time stamp',
  gYear: 'Year (gYear)',
  gMonth: 'Month (gMonth)',
  gDay: 'Day (gDay)',
  gYearMonth: 'Year month (gYearMonth)',
  gMonthDay: 'Month day (gMonthDay)',
  duration: 'Duration',
  yearMonthDuration: 'Year-month duration',
  dayTimeDuration: 'Day-time duration',
  byte: 'Byte',
  short: 'Short',
  int: 'Int',
  long: 'Long',
  unsignedByte: 'Unsigned byte',
  unsignedShort: 'Unsigned short',
  unsignedInt: 'Unsigned int',
  unsignedLong: 'Unsigned long',
  positiveInteger: 'Positive integer',
  nonNegativeInteger: 'Non-negative integer',
  negativeInteger: 'Negative integer',
  nonPositiveInteger: 'Non-positive integer',
  hexBinary: 'Hex binary',
  base64Binary: 'Base64 binary',
  anyURI: 'URI (anyURI)',
  language: 'Language',
  normalizedString: 'Normalized string',
  token: 'Token',
  NMTOKEN: 'NMToken',
  Name: 'Name',
  NCName: 'NCName',
}

export function isEntityDatatype(value: string): value is EntityDatatype {
  return (ENTITY_DATATYPES as readonly string[]).includes(value)
}

/**
 * Aliases used by the pre-RDF-parity versions of the application. The database
 * backfill is handled by migrations/0014_rename_legacy_datatypes.sql; this map
 * is kept so older JSON exports can still be imported transparently.
 */
export const LEGACY_DATATYPE_ALIASES: Record<string, EntityDatatype> = {
  url: 'anyURI',
  datetime: 'dateTime',
  year: 'gYear',
  month: 'gMonth',
  day: 'gDay',
}

/**
 * Normalizes a stored datatype value: either a current canonical value or a
 * legacy alias. Returns null when the value is not a known datatype.
 */
export function normalizeDatatype(value: string): EntityDatatype | null {
  return LEGACY_DATATYPE_ALIASES[value] ?? (isEntityDatatype(value) ? value : null)
}

/**
 * Normalizes a user-provided lexical value so it conforms to the canonical
 * XSD lexical space for the given datatype. Unrecognized shapes pass through
 * trimmed.
 */
export function normalizeLexicalValue(value: string, datatype: EntityDatatype): string {
  const trimmed = value.trim()

  if (datatype === 'boolean') {
    const lowerValue = trimmed.toLowerCase()
    if (['true', 'false', '1', '0'].includes(lowerValue)) {
      return lowerValue
    }
  }

  if (datatype === 'gMonth' && /^\d{1,2}$/.test(trimmed)) {
    return `--${trimmed.padStart(2, '0')}`
  }

  if (datatype === 'gDay' && /^\d{1,2}$/.test(trimmed)) {
    return `---${trimmed.padStart(2, '0')}`
  }

  if (datatype === 'gYearMonth' && /^\d{4}-\d{1,2}$/.test(trimmed)) {
    const [year, month] = trimmed.split('-')
    return `${year}-${month.padStart(2, '0')}`
  }

  if (datatype === 'gMonthDay' && /^\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [month, day] = trimmed.split('-')
    return `--${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return trimmed
}
