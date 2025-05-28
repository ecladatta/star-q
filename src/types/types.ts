export type TextOrTableElement = {
  elementIndex: number
  type: 'text' | 'table'
  startOffset: number
  endOffset: number
  value: string | string[][]
  data: any
}

export type EntityType = 'subject' | 'predicate' | 'object'

export type EntityDatatype = 'integer' | 'decimal' | 'boolean' | 'string' | 'date' | 'time' | 'datetime' | 'year' | 'month' | 'day' | 'url'

export type Entity = {
  label: string
  value: string
  custom: boolean
  customId: string | null
  datatype: EntityDatatype | null
  type: EntityType
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
  annotationTag: string
  elementIndex: number
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
}

export type DocumentElement = {
  components: DocumentAnnotationComponent[]
  value: string | string[][]
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
    extractionMetadata: {
      technology: string | null
      texts: { startOffset?: number, endOffset?: number, value: string }[]
      tables: { startOffset?: number, endOffset?: number, tableData: string[][] }[]
    }[]
  }
}

export type CurrentAnnotation = {
  id?: string
  subject?: DocumentAnnotationComponent
  predicate?: DocumentAnnotationComponent
  object?: DocumentAnnotationComponent
}
