import type { LucideIcon } from 'lucide-react'
import type { DocumentAnnotation, DocumentAnnotationComponent, EntityType } from '@/types/types'
import { ArrowRightIcon, BoxIcon, LinkIcon, UserIcon } from 'lucide-react'
import { Fragment, useLayoutEffect, useRef } from 'react'
import { getAnnotationComponentDisplayText, getAnnotationComponentTitle } from '@/lib/annotation-roles'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const ENTITY_ORDER: EntityType[] = ['subject', 'predicate', 'object']

type EntityMeta = {
  icon: LucideIcon
  chipClass: string
}

const ENTITY_META: Record<EntityType, EntityMeta> = {
  subject: {
    icon: UserIcon,
    chipClass: 'bg-subject-soft text-subject-fg',
  },
  predicate: {
    icon: LinkIcon,
    chipClass: 'bg-predicate-soft text-predicate-fg',
  },
  object: {
    icon: BoxIcon,
    chipClass: 'bg-object-soft text-object-fg',
  },
}

function EntityChip({ role, component, inline }: {
  role: EntityType
  component: DocumentAnnotationComponent
  inline: boolean
}) {
  const meta = ENTITY_META[role]
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium',
        inline && 'grow',
        meta.chipClass,
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span
        className={cn('min-w-0 truncate', !inline && 'flex-1')}
        data-chip-text
        title={inline ? undefined : getAnnotationComponentTitle(component)}
      >
        {getAnnotationComponentDisplayText(component)}
      </span>
      {component.unit && (
        <span className="shrink-0 rounded-sm bg-background/50 px-1 text-[10px] font-normal opacity-80">
          {component.unit.label}
        </span>
      )}
    </span>
  )
}

type AnnotationChipsProps = {
  annotation: DocumentAnnotation
  /** 'inline' lays the three chips on one row with arrow separators. */
  direction?: 'stacked' | 'inline'
  className?: string
}

const MAX_CHIP_FLOOR = 72

function pinChipMinWidths(row: HTMLElement) {
  for (const slot of row.querySelectorAll<HTMLElement>('[data-chip-slot]')) {
    const chip = slot.firstElementChild
    const text = chip?.querySelector<HTMLElement>('[data-chip-text]')
    if (!chip || !text) {
      continue
    }
    const natural = chip.clientWidth - text.clientWidth + text.scrollWidth
    slot.style.minWidth = `${Math.min(MAX_CHIP_FLOOR, natural)}px`
  }
}

export function AnnotationChips({ annotation, direction = 'stacked', className }: AnnotationChipsProps) {
  const inline = direction === 'inline'
  const rowRef = useRef<HTMLDivElement | null>(null)
  const chips = ENTITY_ORDER
    .map((entityType) => {
      const component = annotation[entityType]
      return component
        ? { key: entityType, node: <EntityChip role={entityType} component={component} inline={inline} /> }
        : null
    })
    .filter(chip => chip !== null)

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!inline || !row) {
      return
    }
    pinChipMinWidths(row)
  })

  return (
    <div
      ref={rowRef}
      className={cn(
        'min-w-0',
        inline ? 'flex items-center gap-1 overflow-hidden' : 'flex flex-col gap-1',
        className,
      )}
    >
      {chips.map((chip, index) => (
        <Fragment key={chip.key}>
          {inline && index > 0 && (
            <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
          )}
          {inline
            ? (
                <Tooltip>
                  {/* Radix merges the trigger props onto the direct child element, so the trigger wraps a DOM span, not the chip component. */}
                  <TooltipTrigger asChild>
                    <span className="flex min-w-0" data-chip-slot>
                      {chip.node}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{getAnnotationComponentTitle(annotation[chip.key])}</TooltipContent>
                </Tooltip>
              )
            : chip.node}
        </Fragment>
      ))}
    </div>
  )
}
