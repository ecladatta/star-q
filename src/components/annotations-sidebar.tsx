import type { CurrentAnnotation, DocumentAnnotation } from '@/types/types'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from './ui/label'

type AnnotationsSidebarProps = {
  annotations: DocumentAnnotation[]
  showAnnotations: boolean
  onShowAnnotationsChange: (show: boolean) => void
  currentAnnotation: CurrentAnnotation | null
  onAnnotationClick: (annotation: DocumentAnnotation) => void
}

export function AnnotationsSidebar({
  annotations,
  showAnnotations,
  onShowAnnotationsChange,
  currentAnnotation,
  onAnnotationClick,
}: AnnotationsSidebarProps) {
  if (annotations.length === 0) {
    return null
  }

  return (
    <aside className="fixed right-0 top-0 hidden h-screen w-[280px] bg-gray-100 pt-16 md:block">
      <div className="flex h-full flex-col">
        <div className="px-6">
          <h2 className="mb-2 mt-6 shrink-0 text-xl font-bold">Annotations</h2>
          <div className="mb-4 flex shrink-0 items-center gap-1">
            <Checkbox
              id="show-annotations"
              checked={showAnnotations}
              onCheckedChange={checked => onShowAnnotationsChange(checked === true)}
            />
            <Label htmlFor="show-annotations">
              Highlight annotations in doc
            </Label>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="size-full">
            <ul className="space-y-3 px-6 pb-4 pt-1">
              {annotations.map((ann) => {
                const isSelected = currentAnnotation?.id === ann.id
                return (
                  <li key={ann.id} className="mb-3">
                    <button
                      type="button"
                      className={`w-full break-all rounded-md p-2 text-left shadow transition-all ${
                        isSelected
                          ? 'bg-blue-50 ring-2 ring-blue-500/50'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => onAnnotationClick(ann)}
                    >
                      <span className="font-semibold text-orange-500">
                        {ann.subject.annotationValue}
                      </span>
                      {' '}
                      &rarr;
                      {' '}
                      <span className="font-semibold text-blue-500">
                        {ann.predicate.annotationValue}
                      </span>
                      {' '}
                      &rarr;
                      {' '}
                      <span className="font-semibold text-green-500">
                        {ann.object.annotationValue}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        </div>
      </div>
    </aside>
  )
}
