import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { defineConfig } from 'drizzle-kit'

expand(config({ quiet: true }))

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
