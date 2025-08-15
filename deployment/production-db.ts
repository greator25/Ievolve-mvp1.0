// Production database configuration for Cloud SQL
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// For Cloud SQL deployment, we'll use postgres-js instead of Neon
// The Cloud SQL connector handles the Unix domain socket connection
let db: ReturnType<typeof drizzle>;

if (process.env.NODE_ENV === 'production') {
  // Production: Use Cloud SQL connection
  const client = postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 60,
  });
  db = drizzle(client, { schema });
} else {
  // Development: Use existing Neon setup
  import { Pool, neonConfig } from '@neondatabase/serverless';
  import ws from "ws";
  
  neonConfig.webSocketConstructor = ws;
  
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { db };