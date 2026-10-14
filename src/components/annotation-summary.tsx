import type { DocumentAnnotation } from '@/types/types'
import { AnnotationChips } from './annotation-chips'
import { QualifierSummary } from './qualifier-summary'

export function AnnotationSummary({ annotation }: { annotation: DocumentAnnotation }) {
  return (
    <>
      <AnnotationChips annotation={annotation} direction="inline" />
      <QualifierSummary qualifiers={annotation.qualifiers} className="mt-1 pt-1.5" />
    </>
  )
}
