import type { KeyboardEvent, MouseEvent } from 'react'
import type { AnnotationComponentRole } from '@/types/types'
import { cn } from '@/lib/utils'
import Mark from './mark'

function Split(props: {
  start: number
  end: number
  content: string
  role?: AnnotationComponentRole
  mark?: boolean
  isCurrentAnnotation?: boolean
  className?: string
  onClick: (anchorRect?: DOMRect) => void
}) {
  if (props.mark) {
    return <Mark {...props} />
  }

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    props.onClick(e.currentTarget.getBoundingClientRect())
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      props.onClick(e.currentTarget.getBoundingClientRect())
    }
  }

  return (
    <span
      className={cn('cursor-text whitespace-pre-wrap', props.className)}
      data-start={props.start}
      data-end={props.end}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {props.content}
    </span>
  )
}

export default Split
