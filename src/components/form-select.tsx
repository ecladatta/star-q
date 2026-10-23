'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FormSelectProps = {
  name: string
  options: { label: string, value: string }[]
  defaultValue?: string
  className?: string
}

export function FormSelect({ name, options, defaultValue, className }: FormSelectProps) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? '')

  return (
    <>
      <input type="hidden" name={name} value={value} readOnly />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger size="sm" className={className ?? 'w-24'}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
