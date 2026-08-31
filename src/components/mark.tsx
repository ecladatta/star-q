import type { KeyboardEvent, MouseEvent } from 'react'
import type { AnnotationComponentRole } from '@/types/types'
import { cn } from '@/lib/utils'

export type MarkProps = {
  content: string
  start: number
  end: number
  tag?: string
  role?: AnnotationComponentRole
  isCurrentAnnotation?: boolean
  className?: string
  onClick: (anchorRect?: DOMRect) => void
}

const ROLE_MARK: Record<AnnotationComponentRole, string> = {
  'subject': 'bg-subject-soft ring-subject/25',
  'predicate': 'bg-predicate-soft ring-predicate/25',
  'object': 'bg-object-soft ring-object/25',
  'qualifier-predicate': 'bg-qualifier-soft ring-qualifier/25',
  'qualifier-value': 'bg-qualifier-soft ring-qualifier/25',
}

function Mark(props: MarkProps) {
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      props.onClick(e.currentTarget.getBoundingClientRect())
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    const selection = window.getSelection()
    const hasSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0
    // If there's no selection, treat it as a click on the annotation
    if (!hasSelection) {
      e.stopPropagation()
      e.preventDefault()
      props.onClick(e.currentTarget.getBoundingClientRect())
    }
  }

  return (
    // Note: making this span a button (and thus adding a tabIndex)
    // makes it impossible to select text within it, so we disable
    // the eslint rule for this line.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      className={cn(
        'cursor-pointer rounded-sm px-1 whitespace-pre-wrap ring-1 transition-opacity duration-300 select-text ring-inset',
        props.role ? ROLE_MARK[props.role] : 'bg-muted ring-border',
        props.isCurrentAnnotation
          ? 'opacity-100 ring-2 ring-accent/70'
          : 'opacity-70',
        props.className,
      )}
      data-start={props.start}
      data-end={props.end}
      onKeyUp={handleKeyUp}
      onMouseUp={handleMouseUp}
    >
      {props.content}
      {props.tag && (
        <span className="ml-1.5 text-[0.7em] font-medium select-none">{props.tag}</span>
      )}
    </span>
  )
}

export default Mark
