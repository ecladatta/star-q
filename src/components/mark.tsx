import React from 'react'
import { cn } from '@/lib/utils'

export type MarkProps = {
  content: string
  start: number
  end: number
  tag?: string
  color?: string
  isCurrentAnnotation?: boolean
  className?: string
  onClick: ({ start, end }: { start: number, end: number }) => void
}

function Mark(props: MarkProps) {
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      props.onClick({ start: props.start, end: props.end })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection()
    const hasSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0
    // If there's no selection, treat it as a click on the annotation
    if (!hasSelection) {
      e.stopPropagation()
      e.preventDefault()
      props.onClick({ start: props.start, end: props.end })
    }
  }

  return (
    // Note: making this span a button (and thus adding a tabIndex)
    // makes it impossible to select text within it, so we disable
    // the eslint rule for this line.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      className={cn(
        'cursor-pointer select-text whitespace-pre-wrap px-1 transition-opacity duration-300',
        props.isCurrentAnnotation
          ? 'border-2 border-black/20 opacity-100 shadow-md'
          : 'opacity-70',
        props.className,
      )}
      style={{
        backgroundColor: props.isCurrentAnnotation
          ? props.color || 'lightgrey'
          : '#d1d5db',
      }}
      data-start={props.start}
      data-end={props.end}
      onKeyUp={handleKeyUp}
      onMouseUp={handleMouseUp}
    >
      {props.content}
      {props.tag && (
        <span className="ml-1.5 select-none text-[0.7em] font-medium">{props.tag}</span>
      )}
    </span>
  )
}

export default Mark
