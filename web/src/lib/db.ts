import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runMigrations } from './migrate';

type DB = Database.Database;

// Pin the connection on globalThis so Next.js dev hot-reload doesn't open a new
// handle per reload (which leaks file handles and triggers SQLITE_BUSY).
const globalForDb = globalThis as unknown as { __postPlanDb?: DB };

function openDb(): DB {
  const dbPath = resolve(process.env.DATABASE_PATH ?? './data/post-plan.db');
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // concurrent readers + 1 writer
  db.pragma('foreign_keys = ON'); // required for ON DELETE CASCADE
  db.pragma('busy_timeout = 5000'); // wait instead of instantly throwing SQLITE_BUSY

  // Idempotent (CREATE TABLE IF NOT EXISTS) — running here guarantees the schema
  // exists before any query, regardless of whether instrumentation ran first.
  runMigrations(db);
  return db;
}

export const db: DB = globalForDb.__postPlanDb ?? (globalForDb.__postPlanDb = openDb());
