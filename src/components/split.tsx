import React from 'react'
import { cn } from '@/lib/utils'
import Mark from './mark'

function Split(props: {
  start: number
  end: number
  content: string
  color: string
  mark?: boolean
  isCurrentAnnotation?: boolean
  className?: string
  onClick: ({ start, end }: { start: number, end: number }) => void
}) {
  if (props.mark) {
    return <Mark {...props} />
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    props.onClick({ start: props.start, end: props.end })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      props.onClick({ start: props.start, end: props.end })
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
