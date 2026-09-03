import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!);
const database = drizzle({ client });

export const instance = {
    client,
    database
} as const
