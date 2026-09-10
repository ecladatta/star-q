import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import localFont from 'next/font/local'
import { Toaster } from '@/components/toaster'
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

const themeScript = `(function(){try{var t=localStorage.getItem('starq-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark')}if(localStorage.getItem('starq-full-width')==='1'){document.documentElement.classList.add('doc-full-width')}}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The theme and full-width display bootstrap must run before hydration to prevent a light-mode flash. */}
        {/* eslint-disable-next-line react/dom-no-dangerously-set-innerhtml */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider delayDuration={200} disableHoverableContent>
          <Toaster position="top-center" />
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
