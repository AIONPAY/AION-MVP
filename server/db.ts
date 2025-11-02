import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Handle missing DATABASE_URL gracefully for production previews
let pool: Pool;
let db: any;

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set - database features will be unavailable");
  console.warn("This is normal for production previews. Set DATABASE_URL environment variable for full functionality.");
  // Create a mock db object that won't crash the app
  db = null;
} else {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("✓ Database connection established");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    db = null;
  }
}

export { pool, db };