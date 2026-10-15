import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent } from 'react'
import type { AnnotationComponentRole } from '@/types/types'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AnnotationHoverCard } from './annotation-hover-card'
import { useMarkHover } from './mark-hover-context'

export type MarkProps = {
  content: string
  start: number
  end: number
  tag?: string
  unitLabel?: string
  role?: AnnotationComponentRole
  isCurrentAnnotation?: boolean
  className?: string
  componentId?: string
  onClick: (anchorRect?: DOMRect) => void
}

const ROLE_MARK: Record<AnnotationComponentRole, string> = {
  'subject': 'bg-subject-soft ring-subject/25',
  'predicate': 'bg-predicate-soft ring-predicate/25',
  'object': 'bg-object-soft ring-object/25',
  'qualifier-predicate': 'bg-qualifier-soft ring-qualifier/25',
  'qualifier-value': 'bg-qualifier-soft ring-qualifier/25',
}

type MarkSpanDOMProps = ComponentPropsWithoutRef<'span'> & {
  'data-start'?: number
  'data-end'?: number
}

// The span must be built as an explicit props object, not a component
// wrapper. HoverCardTrigger's asChild Slot merges its trigger props onto the
// direct child element, and a component child would receive them without
// forwarding them to the DOM. componentId and onActivate never enter this
// object, so they cannot leak into HTML.
function markSpanProps(
  props: MarkProps,
  onActivate: (anchorRect?: DOMRect) => void,
  onPointerOver?: { enter: (rect: DOMRect) => void, leave: () => void },
  onPointerDown?: () => void,
): MarkSpanDOMProps {
  return {
    'className': cn(
      'cursor-pointer rounded-sm px-1 whitespace-pre-wrap ring-1 transition-opacity duration-300 select-text ring-inset',
      props.role ? ROLE_MARK[props.role] : 'bg-muted ring-border',
      props.isCurrentAnnotation
        ? 'opacity-100 ring-2 ring-accent/70'
        : 'opacity-70',
      props.className,
    ),
    'data-start': props.start,
    'data-end': props.end,
    'role': 'button',
    'tabIndex': 0,
    'onKeyUp': (e: KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation()
        e.preventDefault()
        onActivate(e.currentTarget.getBoundingClientRect())
      }
    },
    'onMouseUp': (e: MouseEvent<HTMLSpanElement>) => {
      const selection = window.getSelection()
      const hasSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0
      if (!hasSelection) {
        e.stopPropagation()
        e.preventDefault()
        onActivate(e.currentTarget.getBoundingClientRect())
      }
    },
    'onPointerEnter': onPointerOver
      ? (e) => {
          if (e.pointerType !== 'touch') {
            onPointerOver.enter(e.currentTarget.getBoundingClientRect())
          }
        }
      : undefined,
    'onPointerLeave': onPointerOver
      ? (e) => {
          if (e.pointerType !== 'touch') {
            onPointerOver.leave()
          }
        }
      : undefined,
    'onPointerDown': onPointerDown
      ? () => onPointerDown?.()
      : undefined,
  }
}

function Mark(props: MarkProps) {
  const { getAnnotationsForComponent, sharedPopoverOpen, onOpenAnnotation } = useMarkHover()
  const [hoverOpen, setHoverOpen] = useState(false)
  const [hoverSide, setHoverSide] = useState<'top' | 'bottom'>('top')
  const [pointerOver, setPointerOver] = useState(false)
  const [lastSharedPopoverOpen, setLastSharedPopoverOpen] = useState(sharedPopoverOpen)
  // Radix schedules its open timer on pointerenter and cannot cancel it from
  // pointerdown, so a press inside the openDelay window would otherwise open
  // the card while the button is held. Open requests are ignored until the
  // next pointerenter.
  const pointerDownRef = useRef(false)
  const annotations = getAnnotationsForComponent(props.componentId ?? '')

  if (lastSharedPopoverOpen !== sharedPopoverOpen) {
    setLastSharedPopoverOpen(sharedPopoverOpen)
    if (sharedPopoverOpen) {
      setHoverOpen(false)
    } else if (pointerOver) {
      setHoverOpen(true)
    }
  }

  const handleHoverOpenChange = (open: boolean) => {
    if (open && pointerDownRef.current) {
      return
    }
    setHoverOpen(open)
  }

  const markChildren = (
    <>
      {props.content}
      {props.tag && (
        <span className="ml-1.5 text-[0.7em] font-medium select-none">{props.tag}</span>
      )}
      {props.unitLabel && (
        <sup data-unit-sup className="ml-0.5 text-[0.65em] font-medium select-none">{props.unitLabel}</sup>
      )}
    </>
  )

  if (annotations.length === 0) {
    return (
      <span {...markSpanProps(props, props.onClick)}>
        {markChildren}
      </span>
    )
  }

  return (
    <AnnotationHoverCard
      open={hoverOpen && !sharedPopoverOpen}
      onOpenChange={handleHoverOpenChange}
      annotations={annotations}
      side={hoverSide}
      onOpenAnnotation={onOpenAnnotation}
    >
      <span
        {...markSpanProps(
          props,
          props.onClick,
          {
            enter: (rect) => {
              setPointerOver(true)
              pointerDownRef.current = false
              setHoverSide(rect.top >= window.innerHeight - rect.bottom ? 'top' : 'bottom')
            },
            leave: () => {
              setPointerOver(false)
              pointerDownRef.current = false
            },
          },
          () => {
            pointerDownRef.current = true
          },
        )}
      >
        {markChildren}
      </span>
    </AnnotationHoverCard>
  )
}

export default Mark
