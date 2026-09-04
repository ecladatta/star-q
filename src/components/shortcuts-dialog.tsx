'use client'
import { InfoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { isMac } from '@/lib/utils'

export function ShortcutsDialog() {
  const ctrlKey = isMac() ? '⌘' : 'Ctrl'

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0"
          aria-label="Keyboard shortcuts"
        >
          <InfoIcon className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to speed up your annotation
            workflow
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">
              Annotation Actions
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Mark as Subject</span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  S
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Mark as Predicate</span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  P
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Mark as Object</span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  O
                </kbd>
              </div>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">
              Navigation
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>
                  Edit annotation (when popover visible)
                </span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  E
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>
                  Clone annotation (when popover visible)
                </span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  C
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Toggle annotations visibility</span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  H
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Clear/Cancel</span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">
              Form Actions
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Clone annotation</span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  C
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Save annotation</span>
                <kbd className="rounded-sm bg-muted px-2 py-1 text-xs">
                  {ctrlKey}
                  +S
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
