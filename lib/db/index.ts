import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// Singleton para la conexión
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (dbInstance) return dbInstance

  const connectionString = process.env.POSTGRES_URL!
  const client = postgres(connectionString, { prepare: false })
  dbInstance = drizzle(client, { schema })

  return dbInstance
}

export const db = getDb()

export { schema, getDb }
