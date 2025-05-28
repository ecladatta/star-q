import Mark from './mark'

function Split(props: {
  start: number
  end: number
  content: string
  color: string
  mark?: boolean
  isCurrentAnnotation?: boolean
  onClick: ({ start, end }: { start: number, end: number }) => void
}) {
  if (props.mark) {
    return <Mark {...props} />
  }

  return (
    <span
      className="whitespace-pre-wrap"
      data-start={props.start}
      data-end={props.end}
    >
      {props.content}
    </span>
  )
}

export default Split
