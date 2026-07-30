import type { Literal, NamedNode } from 'n3'
import type {
  DocumentAnnotationComponent,
  EntityDatatype,
} from '@/types/types'
import { DataFactory } from 'n3'
import { NAMESPACES } from './namespaces'

export type RdfIri = NamedNode
export type RdfLiteral = Literal
export type RdfTerm = RdfIri | RdfLiteral

const { literal: n3Literal, namedNode } = DataFactory

const XSD_DATATYPES: Partial<Record<EntityDatatype, RdfIri>> = {
  boolean: namedNode(`${NAMESPACES.xsd}boolean`),
  date: namedNode(`${NAMESPACES.xsd}date`),
  datetime: namedNode(`${NAMESPACES.xsd}dateTime`),
  day: namedNode(`${NAMESPACES.xsd}gDay`),
  decimal: namedNode(`${NAMESPACES.xsd}decimal`),
  integer: namedNode(`${NAMESPACES.xsd}integer`),
  month: namedNode(`${NAMESPACES.xsd}gMonth`),
  time: namedNode(`${NAMESPACES.xsd}time`),
  url: namedNode(`${NAMESPACES.xsd}anyURI`),
  year: namedNode(`${NAMESPACES.xsd}gYear`),
}

export function iri(value: string): RdfIri {
  return namedNode(value)
}

export function literal(
  value: string,
  datatype?: EntityDatatype,
): RdfLiteral {
  if (!datatype || datatype === 'string') {
    return n3Literal(value)
  }

  const xsdDatatype = XSD_DATATYPES[datatype]
  return xsdDatatype
    ? n3Literal(normalizeLexicalValue(value, datatype), xsdDatatype)
    : n3Literal(value)
}

export function corpusIri(corpusId: string): RdfIri {
  return iri(`${NAMESPACES.corpus}${encodeURIComponent(corpusId)}`)
}

export function documentIri(documentId: string): RdfIri {
  return iri(`${NAMESPACES.document}${encodeURIComponent(documentId)}`)
}

export function elementIri(documentId: string, elementIndex: number): RdfIri {
  return iri(`${documentIri(documentId).value}/element/${elementIndex}`)
}

export function textContextIri(
  documentId: string,
  elementIndex: number,
  endIndex: number,
): RdfIri {
  return iri(`${elementIri(documentId, elementIndex).value}#char=0,${endIndex}`)
}

export function textMentionIri(
  documentId: string,
  elementIndex: number,
  beginIndex: number,
  endIndex: number,
): RdfIri {
  return iri(`${elementIri(documentId, elementIndex).value}#char=${beginIndex},${endIndex}`)
}

export function tableColumnIri(
  documentId: string,
  elementIndex: number,
  columnIndex: number,
): RdfIri {
  return iri(`${elementIri(documentId, elementIndex).value}/column/${columnIndex}`)
}

export function tableCellIri(
  documentId: string,
  elementIndex: number,
  rowIndex: number,
  columnIndex: number,
): RdfIri {
  return iri(
    `${elementIri(documentId, elementIndex).value}/row/${rowIndex}/cell/${columnIndex}`,
  )
}

export function annotationIri(componentId: string): RdfIri {
  return iri(`${NAMESPACES.annotation}${encodeURIComponent(componentId)}`)
}

export function statementIri(statementId: string): RdfIri {
  return iri(`${NAMESPACES.statement}${encodeURIComponent(statementId)}`)
}

export function subjectTerm(
  component: DocumentAnnotationComponent,
  corpusId: string,
): RdfIri | null {
  return entityIri(component, corpusId)
}

export function predicateTerm(
  component: DocumentAnnotationComponent,
  corpusId: string,
  namespace: 'wdt' | 'pq',
): RdfIri | null {
  return propertyTerm(component, corpusId, namespace)
}

export function objectTerm(
  component: DocumentAnnotationComponent,
  corpusId: string,
): RdfTerm {
  return entityIri(component, corpusId)
    ?? literal(
      component.entityValue?.trim() || component.annotationValue,
      component.entityDatatype ?? undefined,
    )
}

export function componentBodyTerm(
  component: DocumentAnnotationComponent,
  corpusId: string,
): RdfTerm | null {
  if (
    component.annotationTag === 'predicate'
    || component.annotationTag === 'qualifier-predicate'
  ) {
    return propertyTerm(component, corpusId, 'wd')
  }

  return objectTerm(component, corpusId)
}

function entityIri(
  component: DocumentAnnotationComponent,
  corpusId: string,
): RdfIri | null {
  if (component.entityCustomId) {
    return customResourceIri(corpusId, 'entity', component.entityCustomId)
  }

  const value = component.entityValue?.trim()
  if (value && /^[QP]\d+$/.test(value)) {
    return iri(`${NAMESPACES.wd}${value}`)
  }

  return value ? absoluteIri(value) : null
}

function propertyTerm(
  component: DocumentAnnotationComponent,
  corpusId: string,
  namespace: 'wd' | 'wdt' | 'pq',
): RdfIri | null {
  if (component.entityCustomId) {
    return customResourceIri(corpusId, 'relation', component.entityCustomId)
  }

  const value = component.entityValue?.trim()
  if (value && /^P\d+$/.test(value)) {
    return iri(`${NAMESPACES[namespace]}${value}`)
  }

  return value ? absoluteIri(value) : null
}

function customResourceIri(
  corpusId: string,
  kind: 'entity' | 'relation',
  resourceId: string,
): RdfIri {
  return iri(
    `${corpusIri(corpusId).value}/${kind}/${encodeURIComponent(resourceId)}`,
  )
}

function absoluteIri(value: string): RdfIri | null {
  try {
    const url = new URL(value)
    if (!['http:', 'https:', 'urn:'].includes(url.protocol)) {
      return null
    }

    return iri(url.toString())
  } catch {
    return null
  }
}

export function iriOrLiteral(value: string): RdfTerm {
  return absoluteIri(value) ?? literal(value)
}

function normalizeLexicalValue(value: string, datatype: EntityDatatype): string {
  const trimmed = value.trim()

  if (datatype === 'boolean') {
    const lowerValue = trimmed.toLowerCase()
    if (['true', 'false', '1', '0'].includes(lowerValue)) {
      return lowerValue
    }
  }

  if (datatype === 'month' && /^\d{1,2}$/.test(trimmed)) {
    return `--${trimmed.padStart(2, '0')}`
  }

  if (datatype === 'day' && /^\d{1,2}$/.test(trimmed)) {
    return `---${trimmed.padStart(2, '0')}`
  }

  return trimmed
}
