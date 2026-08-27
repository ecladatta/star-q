/* eslint-disable ts/consistent-type-definitions -- module augmentation requires interfaces */
import type { DefaultSession } from 'next-auth'
import type { UserRole, UserStatus } from '@/db/schema'

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    username?: string | null
    role?: UserRole
    status?: UserStatus
    sessionVersion?: number
    mustChangePassword?: boolean
    valid?: boolean
  }
}

declare module 'next-auth' {
  interface User {
    username?: string | null
    role?: UserRole
    status?: UserStatus
    sessionVersion?: number
    mustChangePassword?: boolean
    valid?: boolean
  }

  interface Session {
    user: DefaultSession['user'] & {
      id: string
      username: string | null
      role: UserRole
      status: UserStatus
      sessionVersion: number
      mustChangePassword: boolean
      valid: boolean
    }
  }
}
