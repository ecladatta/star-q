import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthenticatedUserForOnboarding } from '@/lib/auth-utils'
import { hashPassword } from '@/lib/password-auth'
import { changeOwnPassword } from './accountActions'

const { redirectMock, signInMock, signOutMock, transactionMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  transactionMock: vi.fn(),
}))

vi.mock('@/db/drizzle', () => ({ db: { transaction: transactionMock } }))
vi.mock('@/auth', () => ({ signIn: signInMock, signOut: signOutMock }))
vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/app-settings', () => ({
  APP_SETTINGS_ID: 'app-settings',
  getAppSettings: vi.fn(),
  isLocalCredentialsEnabled: vi.fn().mockReturnValue(true),
}))
vi.mock('@/lib/auth-utils', () => ({
  ForbiddenError: class ForbiddenError extends Error {},
  getAuthenticatedUserForOnboarding: vi.fn(),
}))

type SessionUser = Awaited<ReturnType<typeof getAuthenticatedUserForOnboarding>>

const CURRENT_PASSWORD = 'correct-current'
const NEW_PASSWORD = 'brand-new-pass'

describe('changeOwnPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInMock.mockResolvedValue(undefined)
    transactionMock.mockImplementation(async (fn: (trx: unknown) => Promise<void>) => fn(makeTrx()))
  })

  it('rejects a normal change when the current password is wrong', async () => {
    await mockUser(false)

    await expect(changeOwnPassword(makeForm('not-the-password', NEW_PASSWORD)))
      .rejects
      .toThrow('Current password is incorrect.')
    expect(transactionMock).not.toHaveBeenCalled()
    expect(signInMock).not.toHaveBeenCalled()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('re-signs in and returns to the settings page after a normal change', async () => {
    await mockUser(false)

    await changeOwnPassword(makeForm(CURRENT_PASSWORD, NEW_PASSWORD))

    expect(transactionMock).toHaveBeenCalledOnce()
    expect(signInMock).toHaveBeenCalledWith('credentials', { username: 'user-1', password: NEW_PASSWORD, redirect: false })
    expect(redirectMock).toHaveBeenCalledWith('/account?password=saved')
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('lands in the app after a forced temporary-password change', async () => {
    await mockUser(true)

    await changeOwnPassword(makeForm(null, NEW_PASSWORD))

    expect(transactionMock).toHaveBeenCalledOnce()
    expect(signInMock).toHaveBeenCalledWith('credentials', { username: 'user-1', password: NEW_PASSWORD, redirect: false })
    expect(redirectMock).toHaveBeenCalledWith('/')
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('ignores a wrong current password on a forced temporary-password change', async () => {
    await mockUser(true)

    await changeOwnPassword(makeForm('not-the-password', NEW_PASSWORD))

    expect(transactionMock).toHaveBeenCalledOnce()
    expect(signInMock).toHaveBeenCalledWith('credentials', { username: 'user-1', password: NEW_PASSWORD, redirect: false })
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('falls back to the signed-out exit when the fresh sign-in is refused', async () => {
    await mockUser(false)
    signInMock.mockRejectedValueOnce(new Error('CredentialsSignin'))

    await changeOwnPassword(makeForm(CURRENT_PASSWORD, NEW_PASSWORD))

    expect(signOutMock).toHaveBeenCalledOnce()
    expect(redirectMock).toHaveBeenCalledWith('/sign-in')
  })
})

async function mockUser(mustChangePassword: boolean) {
  const passwordHash = await hashPassword(CURRENT_PASSWORD)
  vi.mocked(getAuthenticatedUserForOnboarding).mockResolvedValue({
    id: 'user-1',
    username: 'user-1',
    passwordHash,
    mustChangePassword,
  } as SessionUser)
}

function makeForm(currentPassword: string | null, newPassword: string) {
  const formData = new FormData()
  if (currentPassword !== null) {
    formData.set('currentPassword', currentPassword)
  }
  formData.set('newPassword', newPassword)
  formData.set('passwordConfirmation', newPassword)
  return formData
}

function makeTrx() {
  const step: Record<string, unknown> = {}
  for (const method of ['update', 'set', 'where', 'insert', 'values']) {
    step[method] = vi.fn().mockReturnValue(step)
  }
  return step
}
