import { Pool, type PoolConfig } from "pg";
import { SCHEMA_SQL } from "./schema";

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

/** Account routes must call this before touching Postgres. */
export function accountsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function sslConfig(connectionString: string): PoolConfig["ssl"] {
  if (process.env.DATABASE_SSL === "disable") return undefined;
  if (process.env.DATABASE_SSL === "require") return { rejectUnauthorized: false };
  if (/localhost|127\.0\.0\.1/.test(connectionString)) return undefined;
  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Account features need a Postgres database.",
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: sslConfig(connectionString),
      max: 5,
    });
    pool.on("error", (error) => {
      console.error("Postgres pool error:", error.message);
    });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaPromise = null;
        throw error;
      });
  }
  await schemaPromise;
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  await ensureSchema();
  const client = getPool();
  const result = await client.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
