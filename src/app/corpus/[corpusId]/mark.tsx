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
    <button
      type="button"
      style={{ backgroundColor: props.color || 'lightgrey', padding: '0 4px', border: 'none', cursor: 'pointer' }}
      data-start={props.start}
      data-end={props.end}
      onClick={() => props.onClick({ start: props.start, end: props.end })}
    >
      {props.content}
      {props.tag && (
        <span style={{ fontSize: '0.7em', fontWeight: 500, marginLeft: 6 }}>{props.tag}</span>
      )}
    </button>
  )
}

export default Mark
