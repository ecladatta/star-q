import type { LucideIcon } from 'lucide-react'
import type { DocumentAnnotation, DocumentAnnotationComponent, EntityType } from '@/types/types'
import { ArrowRightIcon, BoxIcon, LinkIcon, UserIcon } from 'lucide-react'
import { Fragment } from 'react'
import { getAnnotationComponentDisplayText, getAnnotationComponentTitle } from '@/lib/annotation-roles'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

// eslint-disable-next-line react-refresh/only-export-components -- consumed by the list popover's create-mention buttons
export const ENTITY_ORDER: EntityType[] = ['subject', 'predicate', 'object']

export type EntityMeta = {
  icon: LucideIcon
  chipClass: string
  buttonClass: string
  tooltip: string
  hotkey: string
  label: string
}

// eslint-disable-next-line react-refresh/only-export-components -- consumed by the list popover's create-mention buttons
export const ENTITY_META: Record<EntityType, EntityMeta> = {
  subject: {
    icon: UserIcon,
    chipClass: 'bg-subject-soft text-subject-fg',
    buttonClass: 'border-subject/50 text-subject-fg hover:bg-subject-soft/50 focus-visible:ring-subject',
    tooltip: 'New subject from this mention (S)',
    hotkey: 'S',
    label: 'Subject',
  },
  predicate: {
    icon: LinkIcon,
    chipClass: 'bg-predicate-soft text-predicate-fg',
    buttonClass: 'border-predicate/50 text-predicate-fg hover:bg-predicate-soft/50 focus-visible:ring-predicate',
    tooltip: 'New predicate from this mention (P)',
    hotkey: 'P',
    label: 'Predicate',
  },
  object: {
    icon: BoxIcon,
    chipClass: 'bg-object-soft text-object-fg',
    buttonClass: 'border-object/50 text-object-fg hover:bg-object-soft/50 focus-visible:ring-object',
    tooltip: 'New object from this mention (O)',
    hotkey: 'O',
    label: 'Object',
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
      className={cn('flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium', meta.chipClass)}
    >
      <Icon className="size-3 shrink-0" />
      <span
        className={cn('min-w-0 truncate', !inline && 'flex-1')}
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

export function AnnotationChips({ annotation, direction = 'stacked', className }: AnnotationChipsProps) {
  const inline = direction === 'inline'
  const chips = ENTITY_ORDER
    .map((entityType) => {
      const component = annotation[entityType]
      return component
        ? { key: entityType, node: <EntityChip role={entityType} component={component} inline={inline} /> }
        : null
    })
    .filter(chip => chip !== null)

  return (
    <div
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
                  <TooltipTrigger asChild>
                    <span className="flex min-w-0">
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
