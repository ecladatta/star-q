import type { Literal, NamedNode, Quad } from 'n3'
import type { RdfExportMode } from './export-format'
import type { RdfTerm } from './rdf/terms'
import type {
  AnnotationExport,
  DocumentAnnotationComponent,
  DocumentExport,
  ExportModel,
  TextOrTableElement,
} from '@/types/types'
import { DataFactory, Writer } from 'n3'
import { buildDocumentElements } from '@/lib/document-elements'
import {
  FULL_PREFIXES,
  NAMESPACES,
  TRUTHY_PREFIXES,
} from './rdf/namespaces'
import {
  annotationIri,
  componentBodyTerm,
  corpusIri,
  documentIri,
  elementIri,
  iriOrLiteral,
  objectTerm,
  predicateTerm,
  statementIri,
  subjectTerm,
  tableCellIri,
  tableColumnIri,
  textContextIri,
  textMentionIri,
} from './rdf/terms'

const {
  blankNode,
  literal,
  namedNode,
  quad,
} = DataFactory

const RDF_TYPE = namedNode(`${NAMESPACES.rdf}type`)
const RDF_PROPERTY = namedNode(`${NAMESPACES.rdf}Property`)
const RDF_REIFIES = namedNode(`${NAMESPACES.rdf}reifies`)
const RDF_VALUE = namedNode(`${NAMESPACES.rdf}value`)
const RDFS_LABEL = namedNode(`${NAMESPACES.rdfs}label`)
const RDFS_RANGE = namedNode(`${NAMESPACES.rdfs}range`)
const XSD_INTEGER = namedNode(`${NAMESPACES.xsd}integer`)

const DCAT_DATASET = namedNode(`${NAMESPACES.dcat}Dataset`)
const DCTERMS_HAS_PART = namedNode(`${NAMESPACES.dcterms}hasPart`)
const DCTERMS_IS_PART_OF = namedNode(`${NAMESPACES.dcterms}isPartOf`)
const DCTERMS_SOURCE = namedNode(`${NAMESPACES.dcterms}source`)
const DCTERMS_TITLE = namedNode(`${NAMESPACES.dcterms}title`)
const FOAF_DOCUMENT = namedNode(`${NAMESPACES.foaf}Document`)

const NIF_ANCHOR_OF = namedNode(`${NAMESPACES.nif}anchorOf`)
const NIF_BEGIN_INDEX = namedNode(`${NAMESPACES.nif}beginIndex`)
const NIF_CONTEXT = namedNode(`${NAMESPACES.nif}Context`)
const NIF_END_INDEX = namedNode(`${NAMESPACES.nif}endIndex`)
const NIF_IS_STRING = namedNode(`${NAMESPACES.nif}isString`)
const NIF_PHRASE = namedNode(`${NAMESPACES.nif}Phrase`)
const NIF_REFERENCE_CONTEXT = namedNode(`${NAMESPACES.nif}referenceContext`)
const NIF_RFC5147_STRING = namedNode(`${NAMESPACES.nif}RFC5147String`)

const CSVW_CELL = namedNode(`${NAMESPACES.csvw}Cell`)
const CSVW_COLUMN = namedNode(`${NAMESPACES.csvw}Column`)
const CSVW_TABLE = namedNode(`${NAMESPACES.csvw}Table`)
const CSVW_TITLE = namedNode(`${NAMESPACES.csvw}title`)

const AT_COLUMN_INDEX = namedNode(`${NAMESPACES.at}columnIndex`)
const AT_ROW_INDEX = namedNode(`${NAMESPACES.at}rowIndex`)

const OA_ANNOTATION = namedNode(`${NAMESPACES.oa}Annotation`)
const OA_HAS_BODY = namedNode(`${NAMESPACES.oa}hasBody`)
const OA_HAS_TARGET = namedNode(`${NAMESPACES.oa}hasTarget`)
const PROV_WAS_DERIVED_FROM = namedNode(`${NAMESPACES.prov}wasDerivedFrom`)

type TextTarget = {
  type: 'text'
  iri: NamedNode
  contextIri: NamedNode
  beginIndex: number
  endIndex: number
  anchor: string
}

type ColumnTarget = {
  type: 'column'
  iri: NamedNode
  tableIri: NamedNode
  columnIndex: number
  title: string
}

type CellTarget = {
  type: 'cell'
  iri: NamedNode
  tableIri: NamedNode
  rowIndex: number
  columnIndex: number
  value: string
}

type AnnotationTarget = TextTarget | ColumnTarget | CellTarget

type ComponentProjection = {
  iri: NamedNode
  body: RdfTerm
  target: AnnotationTarget
}

type FullDocumentContext = {
  corpusId: string
  document: DocumentExport
  elements: TextOrTableElement[]
  emittedTargets: Set<string>
  emittedAnnotations: Set<string>
}

export function serializeRdfCorpusExport(
  corpusData: ExportModel,
  mode: RdfExportMode,
): string {
  const writer = createWriter(mode)

  if (mode === 'full') {
    addOntology(writer)
    addCorpus(writer, corpusData)
  } else {
    for (const document of corpusData.documents) {
      document.annotations.forEach((annotation, annotationIndex) =>
        addTruthyAnnotation(
          writer,
          corpusData.id,
          document.id,
          annotation,
          annotationIndex,
        ),
      )
    }
  }

  return finishWriter(writer)
}

function addTruthyAnnotation(
  writer: Writer,
  corpusId: string,
  documentId: string,
  annotation: AnnotationExport,
  annotationIndex: number,
) {
  const statement = resolveStatement(corpusId, annotation)
  if (!statement) {
    return
  }

  writer.addQuad(statement.subject, statement.predicate, statement.object)
  const qualifiers = resolveQualifiers(corpusId, annotation)
  if (qualifiers.length === 0) {
    return
  }

  const reifier = blankNode(
    `${annotation.id ?? `${documentId}-${annotationIndex}`}`,
  )
  addTripleTerm(writer, reifier, RDF_REIFIES, statement.triple)
  for (const qualifier of qualifiers) {
    writer.addQuad(reifier, qualifier.predicate, qualifier.value)
  }
}

function addCorpus(writer: Writer, corpusData: ExportModel) {
  const corpus = corpusIri(corpusData.id)
  writer.addQuad(corpus, RDF_TYPE, DCAT_DATASET)
  if (corpusData.title) {
    writer.addQuad(corpus, DCTERMS_TITLE, literal(corpusData.title))
  }
  for (const document of corpusData.documents) {
    writer.addQuad(corpus, DCTERMS_HAS_PART, documentIri(document.id))
  }

  for (const document of corpusData.documents) {
    addFullDocument(writer, corpusData.id, document)
  }
}

function addFullDocument(
  writer: Writer,
  corpusId: string,
  document: DocumentExport,
) {
  const documentNode = documentIri(document.id)
  const elements = buildDocumentElements(document.raw)
  const context: FullDocumentContext = {
    corpusId,
    document,
    elements,
    emittedTargets: new Set(),
    emittedAnnotations: new Set(),
  }

  writer.addQuad(documentNode, RDF_TYPE, FOAF_DOCUMENT)
  writer.addQuad(documentNode, DCTERMS_IS_PART_OF, corpusIri(corpusId))
  writer.addQuad(documentNode, DCTERMS_TITLE, literal(document.title))
  for (const source of sourceTerms(document)) {
    writer.addQuad(documentNode, DCTERMS_SOURCE, source)
  }
  for (const element of elements) {
    writer.addQuad(documentNode, DCTERMS_HAS_PART, documentElementIri(document.id, element))
  }
  for (const element of elements) {
    addDocumentElement(writer, document.id, element)
  }
  document.annotations.forEach((annotation, annotationIndex) =>
    addFullAnnotation(writer, context, annotation, annotationIndex),
  )
}

function addDocumentElement(
  writer: Writer,
  documentId: string,
  element: TextOrTableElement,
) {
  if (element.type === 'text') {
    const value = element.value
    const context = textContextIri(documentId, element.elementIndex, value.length)
    writer.addQuad(context, RDF_TYPE, NIF_CONTEXT)
    writer.addQuad(context, RDF_TYPE, NIF_RFC5147_STRING)
    writer.addQuad(context, DCTERMS_IS_PART_OF, documentIri(documentId))
    writer.addQuad(context, NIF_BEGIN_INDEX, integerLiteral(0))
    writer.addQuad(context, NIF_END_INDEX, integerLiteral(value.length))
    writer.addQuad(context, NIF_IS_STRING, literal(value))
    return
  }

  const table = elementIri(documentId, element.elementIndex)
  writer.addQuad(table, RDF_TYPE, CSVW_TABLE)
  writer.addQuad(table, DCTERMS_IS_PART_OF, documentIri(documentId))
}

function addFullAnnotation(
  writer: Writer,
  context: FullDocumentContext,
  annotation: AnnotationExport,
  annotationIndex: number,
) {
  const statement = resolveStatement(context.corpusId, annotation)
  if (
    !statement
    || !annotation.subject
    || !annotation.predicate
    || !annotation.object
  ) {
    return
  }

  const subjectComponent = projectComponent(context, annotation.subject)
  const predicateComponent = projectComponent(context, annotation.predicate)
  const objectComponent = projectComponent(context, annotation.object)
  if (!subjectComponent || !predicateComponent || !objectComponent) {
    return
  }
  const components = [subjectComponent, predicateComponent, objectComponent]

  for (const component of components) {
    addComponentAnnotation(writer, context, component)
  }

  writer.addQuad(statement.subject, statement.predicate, statement.object)
  const statementNode = statementIri(
    annotation.id ?? `${context.document.id}-${annotationIndex}`,
  )
  addTripleTerm(writer, statementNode, RDF_REIFIES, statement.triple)
  for (const component of components) {
    writer.addQuad(statementNode, PROV_WAS_DERIVED_FROM, component.iri)
  }

  for (const qualifier of sortedQualifiers(annotation)) {
    addFullQualifier(writer, context, statementNode, qualifier)
  }
}

function addFullQualifier(
  writer: Writer,
  context: FullDocumentContext,
  statementNode: NamedNode,
  qualifier: NonNullable<AnnotationExport['qualifiers']>[number],
) {
  const predicate = predicateTerm(qualifier.predicate, context.corpusId, 'pq')
  const predicateComponent = projectComponent(context, qualifier.predicate)
  const valueComponent = projectComponent(context, qualifier.value)
  if (!predicate || !predicateComponent || !valueComponent) {
    return
  }

  addComponentAnnotation(writer, context, predicateComponent)
  addComponentAnnotation(writer, context, valueComponent)

  const value = valueComponent.body
  const qualifierTriple = quad(statementNode, predicate, value)
  writer.addQuad(statementNode, predicate, value)

  const qualifierReifier = blankNode(qualifier.id)
  addTripleTerm(writer, qualifierReifier, RDF_REIFIES, qualifierTriple)
  writer.addQuad(
    qualifierReifier,
    PROV_WAS_DERIVED_FROM,
    predicateComponent.iri,
  )
  writer.addQuad(
    qualifierReifier,
    PROV_WAS_DERIVED_FROM,
    valueComponent.iri,
  )
}

function addComponentAnnotation(
  writer: Writer,
  context: FullDocumentContext,
  component: ComponentProjection,
) {
  addAnnotationTarget(writer, context, component.target)
  if (context.emittedAnnotations.has(component.iri.value)) {
    return
  }

  context.emittedAnnotations.add(component.iri.value)
  writer.addQuad(component.iri, RDF_TYPE, OA_ANNOTATION)
  writer.addQuad(component.iri, OA_HAS_TARGET, component.target.iri)
  writer.addQuad(component.iri, OA_HAS_BODY, component.body)
}

function addAnnotationTarget(
  writer: Writer,
  context: FullDocumentContext,
  target: AnnotationTarget,
) {
  if (context.emittedTargets.has(target.iri.value)) {
    return
  }
  context.emittedTargets.add(target.iri.value)

  if (target.type === 'text') {
    writer.addQuad(target.iri, RDF_TYPE, NIF_PHRASE)
    writer.addQuad(target.iri, RDF_TYPE, NIF_RFC5147_STRING)
    writer.addQuad(target.iri, NIF_REFERENCE_CONTEXT, target.contextIri)
    writer.addQuad(target.iri, NIF_BEGIN_INDEX, integerLiteral(target.beginIndex))
    writer.addQuad(target.iri, NIF_END_INDEX, integerLiteral(target.endIndex))
    writer.addQuad(target.iri, NIF_ANCHOR_OF, literal(target.anchor))
    return
  }

  if (target.type === 'column') {
    writer.addQuad(target.iri, RDF_TYPE, CSVW_COLUMN)
    writer.addQuad(target.iri, DCTERMS_IS_PART_OF, target.tableIri)
    writer.addQuad(target.iri, AT_COLUMN_INDEX, integerLiteral(target.columnIndex))
    writer.addQuad(target.iri, CSVW_TITLE, literal(target.title))
    return
  }

  writer.addQuad(target.iri, RDF_TYPE, CSVW_CELL)
  writer.addQuad(target.iri, DCTERMS_IS_PART_OF, target.tableIri)
  writer.addQuad(target.iri, AT_ROW_INDEX, integerLiteral(target.rowIndex))
  writer.addQuad(target.iri, AT_COLUMN_INDEX, integerLiteral(target.columnIndex))
  writer.addQuad(target.iri, RDF_VALUE, literal(target.value))
}

function projectComponent(
  context: FullDocumentContext,
  component: DocumentAnnotationComponent,
): ComponentProjection | null {
  const body = componentBodyTerm(component, context.corpusId)
  const target = projectTarget(context, component)
  return body && target
    ? { iri: annotationIri(component.id), body, target }
    : null
}

function projectTarget(
  context: FullDocumentContext,
  component: DocumentAnnotationComponent,
): AnnotationTarget | null {
  const element = context.elements[component.elementIndex]
  if (!element || element.type !== component.annotationType) {
    return null
  }

  if (element.type === 'text') {
    const value = element.value
    const beginIndex = component.annotationStart
    const endIndex = component.annotationEnd
    if (beginIndex < 0 || endIndex < beginIndex || endIndex > value.length) {
      return null
    }

    return {
      type: 'text',
      iri: textMentionIri(
        context.document.id,
        element.elementIndex,
        beginIndex,
        endIndex,
      ),
      contextIri: textContextIri(
        context.document.id,
        element.elementIndex,
        value.length,
      ),
      beginIndex,
      endIndex,
      anchor: component.annotationValue,
    }
  }

  return projectTableTarget(context.document.id, element, component)
}

function projectTableTarget(
  documentId: string,
  element: Extract<TextOrTableElement, { type: 'table' }>,
  component: DocumentAnnotationComponent,
): ColumnTarget | CellTarget | null {
  const table = element.value
  const rowIndex = component.annotationRow
  const columnIndex = component.annotationCell
  if (
    rowIndex === null
    || columnIndex === null
    || rowIndex < 0
    || columnIndex < 0
    || table[rowIndex]?.[columnIndex] === undefined
  ) {
    return null
  }

  const tableIri = elementIri(documentId, element.elementIndex)
  if (rowIndex === 0) {
    return {
      type: 'column',
      iri: tableColumnIri(documentId, element.elementIndex, columnIndex),
      tableIri,
      columnIndex,
      title: table[rowIndex][columnIndex],
    }
  }

  return {
    type: 'cell',
    iri: tableCellIri(
      documentId,
      element.elementIndex,
      rowIndex,
      columnIndex,
    ),
    tableIri,
    rowIndex,
    columnIndex,
    value: table[rowIndex][columnIndex],
  }
}

function resolveStatement(corpusId: string, annotation: AnnotationExport) {
  if (!annotation.subject || !annotation.predicate || !annotation.object) {
    return null
  }

  const subject = subjectTerm(annotation.subject, corpusId)
  const predicate = predicateTerm(annotation.predicate, corpusId, 'wdt')
  if (!subject || !predicate) {
    return null
  }

  const object = objectTerm(annotation.object, corpusId)
  return {
    subject,
    predicate,
    object,
    triple: quad(subject, predicate, object),
  }
}

function resolveQualifiers(corpusId: string, annotation: AnnotationExport) {
  return sortedQualifiers(annotation)
    .flatMap((qualifier) => {
      const predicate = predicateTerm(qualifier.predicate, corpusId, 'pq')
      return predicate
        ? [{ predicate, value: objectTerm(qualifier.value, corpusId) }]
        : []
    })
}

function sortedQualifiers(annotation: AnnotationExport) {
  return (annotation.qualifiers ?? [])
    .toSorted((left, right) => left.position - right.position)
}

function addOntology(writer: Writer) {
  writer.addQuad(AT_ROW_INDEX, RDF_TYPE, RDF_PROPERTY)
  writer.addQuad(AT_ROW_INDEX, RDFS_LABEL, literal('row index'))
  writer.addQuad(AT_ROW_INDEX, RDFS_RANGE, XSD_INTEGER)
  writer.addQuad(AT_COLUMN_INDEX, RDF_TYPE, RDF_PROPERTY)
  writer.addQuad(AT_COLUMN_INDEX, RDFS_LABEL, literal('column index'))
  writer.addQuad(AT_COLUMN_INDEX, RDFS_RANGE, XSD_INTEGER)
}

function documentElementIri(
  documentId: string,
  element: TextOrTableElement,
): NamedNode {
  return element.type === 'text'
    ? textContextIri(documentId, element.elementIndex, element.value.length)
    : elementIri(documentId, element.elementIndex)
}

function sourceTerms(document: DocumentExport): RdfTerm[] {
  const source = document.raw._source.identificationMetadata.url
  const sources = source ? (Array.isArray(source) ? source : [source]) : []

  return sources.map(iriOrLiteral)
}

function integerLiteral(value: number): Literal {
  return literal(String(value), XSD_INTEGER)
}

function addTripleTerm(
  writer: Writer,
  subject: NamedNode | ReturnType<typeof blankNode>,
  predicate: NamedNode,
  triple: Quad,
) {
  // N3.js supports RDF 1.2 triple terms at runtime, while @types/n3 still
  // narrows writer objects to RDF 1.1 terms.
  writer.addQuad(subject, predicate, triple as unknown as NamedNode)
}

function createWriter(mode: RdfExportMode): Writer {
  const prefixes = mode === 'full' ? FULL_PREFIXES : TRUTHY_PREFIXES
  return new Writer({
    prefixes: Object.fromEntries(
      prefixes.map(prefix => [prefix, NAMESPACES[prefix]]),
    ),
  })
}

function finishWriter(writer: Writer): string {
  let output = ''
  let writerError: Error | null = null

  writer.end((error, result) => {
    writerError = error ?? null
    output = result
  })

  if (writerError) {
    throw writerError
  }

  return output
}
