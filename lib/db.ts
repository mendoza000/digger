import postgres from "postgres";

const globalForDb = globalThis as typeof globalThis & {
  __digger_sql__?: ReturnType<typeof postgres>;
};

export function getDb(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  if (!globalForDb.__digger_sql__) {
    globalForDb.__digger_sql__ = postgres(url, {
      // PostgreSQL transaction pooling (common with managed/serverless DBs)
      // does not support prepared statements across pooled connections.
      prepare: false,
      max: process.env.VERCEL ? 1 : 10,
    });
  }
  return globalForDb.__digger_sql__;
}
