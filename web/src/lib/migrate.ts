import type Database from 'better-sqlite3';

interface Migration {
  name: string;
  sql: string;
}

// DDL is inlined as strings (not read from .sql files) so it survives Next.js
// `output: 'standalone'` tracing — loose files there are not copied, which would
// otherwise yield "no such table: plans" only in the production build.
const MIGRATIONS: Migration[] = [
  {
    name: '001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS plans (
        id              TEXT PRIMARY KEY,
        title           TEXT NOT NULL,
        project         TEXT,
        current_version INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS plan_versions (
        plan_id    TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        version    INTEGER NOT NULL,
        html       TEXT NOT NULL,
        title      TEXT,
        note       TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        PRIMARY KEY (plan_id, version)
      );

      CREATE INDEX IF NOT EXISTS idx_plans_updated_at ON plans(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_plans_project    ON plans(project);
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name       TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     );`,
  );

  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name),
  );
  const record = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.name);
    })();
  }
}
