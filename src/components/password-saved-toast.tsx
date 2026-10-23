'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function PasswordSavedToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const announcedRef = useRef(false)

  useEffect(() => {
    // StrictMode runs mount effects twice in dev; announce once.
    if (announcedRef.current || searchParams.get('password') !== 'saved') {
      return
    }
    announcedRef.current = true
    toast.success('Password saved')
    router.replace('/account', { scroll: false })
  }, [searchParams, router])

  return null
}
