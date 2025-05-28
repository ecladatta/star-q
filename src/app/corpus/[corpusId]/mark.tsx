import React from 'react'

export type MarkProps = {
  content: string
  start: number
  end: number
  tag?: string
  color?: string
  isCurrentAnnotation?: boolean
  onClick: ({ start, end }: { start: number, end: number }) => void
}

function Mark(props: MarkProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      style={{
        transition: 'background-color 0.3s, opacity 0.3s',
        backgroundColor: props.isCurrentAnnotation
          ? props.color || 'lightgrey'
          : '#d1d5db',
        opacity: props.isCurrentAnnotation ? 1 : 0.7,
        whiteSpace: 'pre-wrap',
        border: props.isCurrentAnnotation ? '2px solid rgba(0, 0, 0, 0.2)' : 'none',
      }}
      className={`cursor-pointer px-1 ${props.isCurrentAnnotation ? 'shadow-md' : ''}`}
      data-start={props.start}
      data-end={props.end}
      onClick={() => props.onClick({ start: props.start, end: props.end })}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          props.onClick({ start: props.start, end: props.end })
        }
      }}
    >
      {props.content}
      {props.tag && (
        <span className="ml-1.5 select-none text-[0.7em] font-medium">{props.tag}</span>
      )}
    </span>
  )
}

export default Mark
