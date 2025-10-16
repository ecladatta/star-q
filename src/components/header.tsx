import type { Corpus, Document } from '@/db/schema'
import Link from 'next/link'
import { auth, signIn, signOut } from '@/auth'
import { Button } from './ui/button'

type HeaderProps = {
  corpus?: Corpus
  document?: Document
}

async function Header({ corpus, document }: HeaderProps) {
  const session = await auth()

  return (
    <header className="fixed inset-x-0 top-0 z-10 border-b bg-white">
      <nav className="flex flex-col p-2 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="hidden truncate text-lg font-semibold md:block">
              <Link href="/" aria-label="Home">
                ECLADATTA Annotation Tool
              </Link>
            </h1>

            {(corpus || document) && (
              <div className="flex min-w-0 items-center gap-2 text-sm">
                {corpus && (
                  <>
                    <span className="hidden text-gray-400 md:block">/</span>
                    <Link
                      href={`/corpus/${corpus.id}`}
                      className="max-w-[120px] truncate hover:text-gray-900 sm:max-w-[240px]"
                      aria-label={corpus.title ?? undefined}
                    >
                      {corpus.title}
                    </Link>
                  </>
                )}
                {document && (
                  <>
                    <span className="text-gray-400">/</span>
                    <Link
                      href={`/document/${document.id}`}
                      className="max-w-[120px] truncate hover:text-gray-900 sm:max-w-[240px]"
                      aria-label={document.title ?? undefined}
                    >
                      {document.title}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {session
              ? (
                  <>
                    <span className="max-w-[120px] truncate text-sm sm:max-w-[200px]" aria-label={session.user?.name ?? undefined}>
                      {session.user?.name}
                      <span className="hidden text-xs text-gray-500 sm:inline">
                        {session.user?.email && ` (${session.user.email})`}
                      </span>
                    </span>

                    <form
                      action={async () => {
                        'use server'
                        await signOut()
                      }}
                    >
                      <Button variant="outline" type="submit">Sign out</Button>
                    </form>
                  </>
                )
              : (
                  <form
                    action={async () => {
                      'use server'
                      await signIn()
                    }}
                  >
                    <Button variant="outline" type="submit">Sign in</Button>
                  </form>
                )}
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header
