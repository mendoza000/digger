import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;

    const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
    const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
    for (const filename of files) {
      const alreadyApplied = await sql`SELECT filename FROM schema_migrations WHERE filename = ${filename}`;
      if (alreadyApplied.length) continue;

      const contents = await readFile(path.join(migrationsDir, filename), "utf8");
      await sql.begin(async (transaction) => {
        await transaction.unsafe(contents);
        await transaction`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
      });
      console.log(`Applied ${filename}`);
    }
  } finally {
    await sql.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
