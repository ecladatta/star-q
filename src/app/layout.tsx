import type { Metadata } from 'next'
import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import localFont from 'next/font/local'
import Link from 'next/link'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'ECLADATTA Annotation Tool',
  description: 'An annotation tool for ECLADATTA',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          <Toaster position="top-center" />
          <Header />
          <div className="mt-16">{children}</div>
        </TooltipProvider>
      </body>
    </html>
  )
}

async function Header() {
  const session = await auth()

  return (
    <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center border-b bg-white">
      <nav className="flex-1 p-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="shrink-0">
            <h1 className="text-xl font-semibold">
              <Link href="/">ECLADATTA Annotation Tool</Link>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {session && (
              <span className="text-sm">
                {session.user?.name}
                {' '}
                {session.user?.email && `(${session.user.email})`}
              </span>
            )}
            <form
              action={async () => {
                'use server'
                await signOut()
              }}
            >
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </nav>
    </header>
  )
}
