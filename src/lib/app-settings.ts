import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { appSettings } from '@/db/schema'

export const APP_SETTINGS_ID = 'default'

export function isLocalCredentialsEnabled(): boolean {
  return process.env.LOCAL_CREDENTIALS_ENABLED === 'true'
}

export async function getAppSettings() {
  const [settings] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, APP_SETTINGS_ID))

  if (!settings) {
    throw new Error('Application settings are missing. Run the database migrations.')
  }
  return settings
}
