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

const themeScript = `(function(){try{var t=localStorage.getItem('starq-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark')}}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/*
          THESIS: A writing desk for structured data. The interface recedes so the
           annotated text and its subject-predicate-object triples are the product.
           Refuses the stock SaaS dashboard: no card grids, no marketing chrome,
           no default-shadcn surfaces.

          OWN-WORLD: Neutral ground (white paper / #101114 graphite), hairline
          borders, monochrome primary buttons, one indigo accent for focus, links
          and active states. Geist text, Geist Mono for counts, IDs and data.
          4px grid, 6px control radius, dense 13-14px surfaces. Annotations keep
          a three-hue functional coding: amber subject, blue predicate, green
          object, violet qualifiers.

          STORY: A data team lands on their corpora, sees completion at a glance,
          opens a document, selects text, and marks triples in one keystroke.
          Every surface answers: what am I working on, what is its state, what
          next.

           FIRST VIEWPORT: Full-height app frame. 48px top bar: wordmark, primary
            nav (Corpora, Browse, Teams, Invitations, Admin), search, theme and
           account avatar. Below, the corpora page: 20px title row with a New
           corpus primary action, then a dense table of name, owner, completion,
            counts, freshness. Section depth: /admin/* gets a left rail (GitHub
            repo-nav pattern) and /corpus/[id] a horizontal tab bar under the top
            bar (GitHub repo tabs); the document editor is full-width with its
            own corpus header.

            FORM: Operate-mode shell in the GitHub register (top nav + admin
            rail + corpus tab bar), re-IA'd from an earlier Linear/Notion sidebar; user-pinned
           canon, so no concept-seed roll was run (a pinned brief beats the roll).

          FINISH: unreviewed and undocumented is unfinished; this build ends with
          the finish review, the verdict, DESIGN.md, and every shipping raster
          carrying its provenance.
        */}
        <TooltipProvider delayDuration={200}>
          <Toaster position="top-center" />
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
