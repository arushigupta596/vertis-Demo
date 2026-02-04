import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create postgres connection with SSL enabled for Supabase
// Note: Connection errors will be thrown when queries are executed, not on initialization
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
  connection: {
    application_name: 'vertis-doc-chat',
  },
});

export const db = drizzle(client, { schema });
