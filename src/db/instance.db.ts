import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!);
console.log('DB host:', new URL(process.env.DATABASE_URL!).hostname)
const database = drizzle({ client , logger: true });

export const instance = {
    client,
    database
} as const
