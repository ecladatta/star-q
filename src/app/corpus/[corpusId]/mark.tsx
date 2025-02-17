import React from 'react'

export type MarkProps = {
  content: string
  start: number
  end: number
  tag?: string
  color?: string
  onClick: (arg0: any) => any
}

function Mark(props: MarkProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      style={{
        backgroundColor: props.color || 'lightgrey',
        whiteSpace: 'pre-wrap',
      }}
      className="cursor-pointer px-1"
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
