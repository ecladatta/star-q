import type {
  AnnotationExport,
  DocumentAnnotationComponent,
  DocumentAnnotationQualifierExport,
  EntityDatatype,
  ExportModel,
} from '@/types/types'

const NUMERIC_DATATYPES = new Set<EntityDatatype>([
  'integer',
  'decimal',
  'double',
  'float',
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
])

const TIME_DATATYPES = new Set<EntityDatatype>([
  'date',
  'dateTime',
  'dateTimeStamp',
  'gYear',
  'gYearMonth',
])

const WIKIDATA_ENTITY_ID = /^[QP]\d+$/
const WIKIDATA_PROPERTY_ID = /^P\d+$/

export type QuickStatementsExport = {
  body: string
  skippedCount: number
}

export function serializeQuickStatementsCorpusExport(
  corpusData: ExportModel,
): QuickStatementsExport {
  const lines = new Set<string>()
  let skippedCount = 0

  for (const document of corpusData.documents) {
    for (const annotation of document.annotations) {
      const command = renderAnnotation(annotation)
      if (command === null) {
        skippedCount++
        continue
      }

      lines.add(command)
    }
  }

  const body = lines.size > 0 ? `${[...lines].join('\n')}\n` : ''
  return { body, skippedCount }
}

function renderAnnotation(annotation: AnnotationExport): string | null {
  if (!annotation.subject || !annotation.predicate || !annotation.object) {
    return null
  }

  const subject = entityId(annotation.subject)
  const predicate = propertyId(annotation.predicate)
  const object = valueTerm(annotation.object)
  if (!subject || !predicate || object === null) {
    return null
  }

  const parts = [subject, predicate, object]
  for (const qualifier of sortedQualifiers(annotation)) {
    const qualifierPredicate = propertyId(qualifier.predicate)
    const qualifierValue = valueTerm(qualifier.value)
    if (qualifierPredicate && qualifierValue !== null) {
      parts.push(qualifierPredicate, qualifierValue)
    }
  }

  return parts.join('\t')
}

function sortedQualifiers(
  annotation: AnnotationExport,
): DocumentAnnotationQualifierExport[] {
  return (annotation.qualifiers ?? [])
    .toSorted((left, right) => left.position - right.position)
}

function entityId(component: DocumentAnnotationComponent): string | null {
  if (component.entityCustom) {
    return null
  }

  const value = component.entityValue?.trim()
  return value && WIKIDATA_ENTITY_ID.test(value) ? value : null
}

function propertyId(component: DocumentAnnotationComponent): string | null {
  if (component.entityCustom) {
    return null
  }

  const value = component.entityValue?.trim()
  return value && WIKIDATA_PROPERTY_ID.test(value) ? value : null
}

function valueTerm(component: DocumentAnnotationComponent): string | null {
  if (component.entityCustom) {
    return null
  }

  const entityValue = component.entityValue?.trim()
  if (entityValue && WIKIDATA_ENTITY_ID.test(entityValue)) {
    return entityValue
  }

  const lexicalValue = entityValue || component.annotationValue
  return literalValue(lexicalValue, component.entityDatatype, component)
}

function literalValue(
  value: string,
  datatype: EntityDatatype | null,
  component: DocumentAnnotationComponent,
): string | null {
  if (value === '') {
    return null
  }

  if (datatype && NUMERIC_DATATYPES.has(datatype)) {
    return quantityValue(value, component)
  }

  if (datatype && TIME_DATATYPES.has(datatype)) {
    return timeValue(value, datatype) ?? stringValue(value)
  }

  return stringValue(value)
}

// QuickStatements quantity syntax is `amount[lower,upper]Uxx`: optional
// closed bounds in brackets, and only Wikidata unit items after `U`; custom
// corpus units export as bare amounts. Bounds are emitted only when both are
// present and parse as plain decimals, since the bracket form needs both ends.
function unitSuffix(component: DocumentAnnotationComponent): string {
  if (component.unitCustom) {
    return ''
  }

  const unitValue = component.unitValue?.trim()
  return unitValue && /^Q\d+$/.test(unitValue) ? `U${unitValue.slice(1)}` : ''
}

function quantityValue(
  value: string,
  component: DocumentAnnotationComponent,
): string | null {
  const amount = normalizeQuantityAmount(value)
  if (!amount) {
    return null
  }

  const lower = normalizeQuantityAmount(component.quantityLowerBound ?? '')
  const upper = normalizeQuantityAmount(component.quantityUpperBound ?? '')
  const bounds = lower && upper ? `[${lower},${upper}]` : ''
  return `${amount}${bounds}${unitSuffix(component)}`
}

// QuickStatements quantities take a plain decimal without a leading dot or an
// exponent; `.5` / `-.5` normalize to `0.5` / `-0.5`.
function normalizeQuantityAmount(value: string): string | null {
  const trimmed = value.trim()
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) {
    return null
  }

  return trimmed.replace(/^([+-]?)\./, '$10.')
}

const YEAR = '\\d{1,6}'

function timeValue(
  value: string,
  datatype: EntityDatatype,
): string | null {
  const trimmed = value.trim()
  if (datatype === 'gYear') {
    const match = trimmed.match(new RegExp(`^-?${YEAR}$`))
    if (!match) {
      return null
    }

    return `${signedYear(trimmed)}-00-00T00:00:00Z/9`
  }

  if (datatype === 'gYearMonth') {
    const match = trimmed.match(new RegExp(`^(-?${YEAR})-(\\d{1,2})$`))
    if (!match) {
      return null
    }

    const [, year, month] = match
    return `${signedYear(year)}-${month.padStart(2, '0')}-00T00:00:00Z/10`
  }

  if (datatype === 'date') {
    const match = trimmed.match(new RegExp(`^(-?${YEAR})-(\\d{1,2})-(\\d{1,2})$`))
    if (!match) {
      return null
    }

    const [, year, month, day] = match
    return `${signedYear(year)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z/11`
  }

  return dateTimeValue(trimmed)
}

const DATETIME_PATTERN = new RegExp(
  `^(-?${YEAR})-(\\d{1,2})-(\\d{1,2})`
  + 'T(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?(?:\\.\\d+)?'
  + '(Z|[+-]\\d{1,2}(?::\\d{2})?)?$',
)

function dateTimeValue(value: string): string | null {
  const match = value.match(DATETIME_PATTERN)
  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute, second, timezone] = match

  // Only UTC instants can be emitted faithfully. A non-zero offset would
  // require shifting the instant, so fall back to a string instead.
  if (
    timezone
    && timezone !== 'Z'
    && timezone !== '+00:00'
    && timezone !== '-00:00'
  ) {
    return null
  }

  const time
    = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${(second ?? '00').padStart(2, '0')}`
  return `${signedYear(year)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}Z/14`
}

function signedYear(year: string): string {
  if (year.startsWith('-')) {
    return `-${year.slice(1).padStart(4, '0')}`
  }

  return `+${year.padStart(4, '0')}`
}

function stringValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}
