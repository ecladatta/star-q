import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'
import Header from '@/components/header'
import { TooltipProvider } from '@/components/ui/tooltip'
import { APP_NAME } from '@/lib/config'
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
  title: APP_NAME,
  description: 'A web-based tool for annotating texts and tables',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider delayDuration={200}>
          <Toaster position="top-center" />
          <Header />
          <div className="mt-16">{children}</div>
        </TooltipProvider>
      </body>
    </html>
  )
}
