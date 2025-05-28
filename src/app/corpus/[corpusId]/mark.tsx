import { cn } from '@/lib/utils'
import React from 'react'

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
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    props.onClick({ start: props.start, end: props.end })
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      props.onClick({ start: props.start, end: props.end })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        'cursor-pointer whitespace-pre-wrap px-1 transition-opacity duration-300',
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
      onClick={handleClick}
      onKeyUp={handleKeyUp}
      onMouseDown={handleMouseDown}
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
