import Link from 'next/link'
import { auth, signIn, signOut } from '@/auth'
import { Button } from './ui/button'

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
            {session
              ? (
                  <>
                    <span className="text-sm">
                      {session.user?.name}
                      {' '}
                      {session.user?.email && `(${session.user.email})`}
                    </span>
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
                  </>
                )
              : (
                  <form action={async () => {
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
