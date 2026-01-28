import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { drizzle } from 'drizzle-orm/node-postgres'

expand(config({ quiet: true }))

export const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
  },
})
