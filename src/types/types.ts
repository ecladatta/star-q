import type { CorpusCustomEntity, Document } from '@/db/schema'

type DocumentElementBase = {
  elementIndex: number
  startOffset?: number
  endOffset?: number
  data: any
}

export type TextOrTableElement
  = | DocumentElementBase & {
    type: 'text'
    value: string
  }
  | DocumentElementBase & {
    type: 'table'
    value: string[][]
  }

export type EntityType = 'subject' | 'predicate' | 'object'

export type AnnotationComponentRole
  = EntityType
    | 'qualifier-predicate'
    | 'qualifier-value'

export type EntityDatatype
  // Core
  = | 'string'
    | 'boolean'
    | 'decimal'
    | 'integer'
    // IEEE floating-point
    | 'double'
    | 'float'
    // Time and date
    | 'date'
    | 'time'
    | 'dateTime'
    | 'dateTimeStamp'
    // Recurring and partial dates
    | 'gYear'
    | 'gMonth'
    | 'gDay'
    | 'gYearMonth'
    | 'gMonthDay'
    // Durations
    | 'duration'
    | 'yearMonthDuration'
    | 'dayTimeDuration'
    // Limited-range integers
    | 'byte'
    | 'short'
    | 'int'
    | 'long'
    | 'unsignedByte'
    | 'unsignedShort'
    | 'unsignedInt'
    | 'unsignedLong'
    | 'positiveInteger'
    | 'nonNegativeInteger'
    | 'negativeInteger'
    | 'nonPositiveInteger'
    // Encoded binary data
    | 'hexBinary'
    | 'base64Binary'
    // Miscellaneous
    | 'anyURI'
    | 'language'
    | 'normalizedString'
    | 'token'
    | 'NMTOKEN'
    | 'Name'
    | 'NCName'

export type Entity = {
  label: string
  value: string
  custom: boolean
  customId: string | null
  datatype: EntityDatatype | null
  type: EntityType
  description?: string | null
}

export type DocumentAnnotationComponent = {
  id: string
  entityLabel: string | null
  entityValue: string | null
  entityCustom: boolean | null
  entityCustomId: string | null
  entityDatatype: EntityDatatype | null
  annotationStart: number
  annotationEnd: number
  annotationRow: number | null
  annotationCell: number | null
  annotationValue: string
  annotationType: 'text' | 'table'
  annotationTag: AnnotationComponentRole
  elementIndex: number
}

export type DocumentAnnotationQualifierExport = {
  id: string
  predicate: DocumentAnnotationComponent
  value: DocumentAnnotationComponent
  position: number
}

export type DocumentAnnotationQualifier = {
  id: string
  annotationId: string
  predicateId: string
  valueId: string
  position: number
  predicate: DocumentAnnotationComponent
  value: DocumentAnnotationComponent
}

export type CurrentAnnotationQualifier = {
  id: string
  predicate?: DocumentAnnotationComponent
  value?: DocumentAnnotationComponent
  position: number
}

export type AnnotationQualifierInput = {
  id?: string
  predicate: DocumentAnnotationComponent
  predicateEntity: Entity | null
  value: DocumentAnnotationComponent
  valueEntity: Entity | null
  position: number
}

export type AnnotationMention = {
  start: number
  end: number
  elementIndex: number
  row: number | null
  cell: number | null
  value: string
  annotationType: 'text' | 'table'
}

export type DocumentAnnotation = {
  id: string
  subjectId: string
  predicateId: string
  objectId: string
  annotationId: string | null
  documentId: string | null
  corpusId: string | null
  subject: DocumentAnnotationComponent
  predicate: DocumentAnnotationComponent
  object: DocumentAnnotationComponent
  qualifiers: DocumentAnnotationQualifier[]
}

export type DocumentElement = {
  components: DocumentAnnotationComponent[]
  value: string | string[][]
}

export type DocumentExtractionMetadata = {
  technology?: string | null
  texts?: { index?: number, startOffset?: number, endOffset?: number, value: string | null }[]
  tables?: { tableNum?: number, startOffset?: number, endOffset?: number, tableData: Array<Array<string | null>> }[]
}

export type DocumentData = {
  _source: {
    identificationMetadata: {
      id: string
      versionDate: string
      hash: string
      title?: string
      wikidata?: string
      url?: string | string[]
    }
    extractionMetadata: DocumentExtractionMetadata | DocumentExtractionMetadata[]
  }
}

export type CurrentAnnotation = {
  id?: string
  subject?: DocumentAnnotationComponent
  predicate?: DocumentAnnotationComponent
  object?: DocumentAnnotationComponent
  qualifiers?: CurrentAnnotationQualifier[]
}

export type AnnotationExport = {
  id?: string
  subject?: DocumentAnnotationComponent
  predicate?: DocumentAnnotationComponent
  object?: DocumentAnnotationComponent
  qualifiers?: DocumentAnnotationQualifierExport[]
}

export type DocumentExport = {
  id: Document['id']
  title: Document['title']
  createdAt: string
  updatedAt: string | null
  completedAt: string | null
  order: number
  raw: DocumentData
  annotations: AnnotationExport[]
}

export type ExportModel = {
  exportMeta: {
    version: string
    type: 'full-corpus-export'
  }
  id: string
  title: string | null
  createdAt: string | null
  updatedAt: string | null
  documents: DocumentExport[]
  customEntities: CorpusCustomEntity[]
}
