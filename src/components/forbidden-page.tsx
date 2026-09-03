import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this page.</p>
        <Button className="mt-6" asChild>
          <Link href="/">Go to home</Link>
        </Button>
      </div>
    </div>
  )
}
