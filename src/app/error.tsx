'use client'

import { AlertCircle, RefreshCcw } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong!</CardTitle>
          <CardDescription>
            An unexpected error occurred while processing your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error.message && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Error details:
              </p>
              <p className="mt-1 text-sm text-foreground">{error.message}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={() => reset()}
            className="w-full"
            variant="default"
          >
            <RefreshCcw className="size-4" />
            Try again
          </Button>
          <Button
            onClick={() => {
              window.location.href = '/'
            }}
            className="w-full"
            variant="outline"
          >
            Go to home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
