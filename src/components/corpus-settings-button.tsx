'use client'

import type { Corpus } from '@/db/schema'
import { SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { CorpusSettingsDialog } from './corpus-settings-dialog'
import { Button } from './ui/button'

export function CorpusSettingsButton({ corpus }: { corpus: Corpus }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SettingsIcon className="mr-2 size-4" />
        Settings
      </Button>
      <CorpusSettingsDialog
        open={open}
        onOpenChange={setOpen}
        corpus={corpus}
      />
    </>
  )
}

export default CorpusSettingsButton
