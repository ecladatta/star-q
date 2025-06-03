import type { Metadata } from 'next'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'
import Header from '@/components/header'
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
