import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDb?: unknown;
};

function createDb() {
  if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
      });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }
    return drizzlePg(pool, { schema });
  }

  const dataDir = path.join(process.cwd(), ".data", "pglite");
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}

  let client: PGlite;
  try {
    client = new PGlite(dataDir);
  } catch (err) {
    console.warn("PGlite initial open failed, resetting data directory...", err);
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
      fs.mkdirSync(dataDir, { recursive: true });
      client = new PGlite(dataDir);
    } catch {
      client = new PGlite();
    }
  }
  return drizzlePglite(client, { schema });
}

export const pool = globalForDb.__arenaNextJsPostgresqlPool;
export const db = (globalForDb.__arenaNextJsDb ??= createDb()) as NodePgDatabase<typeof schema>;

let migrationPromise: Promise<void> | null = null;

export async function ensureMigrated() {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    try {
      const migrationsFolder = path.join(process.cwd(), "drizzle");
      if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
        const { migrate } = await import("drizzle-orm/node-postgres/migrator");
        await migrate(db as any, { migrationsFolder });
      } else {
        const { migrate } = await import("drizzle-orm/pglite/migrator");
        await migrate(db as any, { migrationsFolder });
      }
    } catch (err: any) {
      console.warn("Migration notice:", err?.message || err);
    }
  })();
  return migrationPromise;
}
