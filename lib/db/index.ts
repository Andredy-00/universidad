import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// Singleton para la conexión
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (db) return db

  const connectionString = process.env.POSTGRES_URL!
  const client = postgres(connectionString, { prepare: false })
  db = drizzle(client, { schema })

  return db
}

export { schema }
