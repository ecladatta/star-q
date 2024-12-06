import Mark from './mark'

function Split(props: { start: number, end: number, content: string, color: string, mark?: boolean, onClick: (arg0: any) => any }) {
  if (props.mark)
    return <Mark {...props} />

  return (
    <span
      role="button"
      className="whitespace-pre-wrap"
      tabIndex={0}
      data-start={props.start}
      data-end={props.end}
      onClick={() => props.onClick({ start: props.start, end: props.end })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          props.onClick({ start: props.start, end: props.end })
        }
      }}
    >
      {props.content}
    </span>
  )
}

export default Split
