import { db } from './db';
import { newId } from './ids';

export interface PlanMeta {
  id: string;
  title: string;
  project: string | null;
  currentVersion: number;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VersionMeta {
  version: number;
  title: string | null;
  note: string | null;
  createdAt: string;
}

export interface PlanContent {
  version: number;
  title: string | null;
  html: string;
}

const META_COLUMNS = `
  p.id              AS id,
  p.title           AS title,
  p.project         AS project,
  p.current_version AS currentVersion,
  (SELECT COUNT(*) FROM plan_versions v WHERE v.plan_id = p.id) AS versionCount,
  p.created_at      AS createdAt,
  p.updated_at      AS updatedAt
`;

const insertPlanStmt = db.prepare('INSERT INTO plans (id, title, project) VALUES (?, ?, ?)');
const insertVersionStmt = db.prepare(
  'INSERT INTO plan_versions (plan_id, version, html, title, note) VALUES (?, ?, ?, ?, ?)',
);
const planExistsStmt = db.prepare('SELECT 1 FROM plans WHERE id = ?');
const maxVersionStmt = db.prepare('SELECT MAX(version) AS m FROM plan_versions WHERE plan_id = ?');
const bumpPlanStmt = db.prepare(
  `UPDATE plans
      SET current_version = ?,
          title           = COALESCE(?, title),
          updated_at      = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?`,
);
const metaByIdStmt = db.prepare(`SELECT ${META_COLUMNS} FROM plans p WHERE p.id = ?`);
const versionsStmt = db.prepare(
  `SELECT version, title, note, created_at AS createdAt
     FROM plan_versions WHERE plan_id = ? ORDER BY version DESC`,
);
const currentContentStmt = db.prepare(
  `SELECT v.version AS version, v.title AS title, v.html AS html
     FROM plan_versions v
     JOIN plans p ON p.id = v.plan_id AND p.current_version = v.version
    WHERE p.id = ?`,
);
const versionContentStmt = db.prepare(
  `SELECT version, title, html FROM plan_versions WHERE plan_id = ? AND version = ?`,
);

export interface CreatePlanInput {
  title: string;
  html: string;
  project?: string | null;
  note?: string | null;
}

export function createPlan(input: CreatePlanInput): PlanMeta {
  const project = input.project ?? null;
  const tx = db.transaction((id: string) => {
    insertPlanStmt.run(id, input.title, project);
    insertVersionStmt.run(id, 1, input.html, input.title, input.note ?? null);
  });

  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    const id = newId();
    try {
      tx(id);
      return getPlanMeta(id)!;
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT')) {
        lastErr = err; // id collision — regenerate and retry
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error('Failed to allocate a unique plan id');
}

export interface AddVersionInput {
  html: string;
  note?: string | null;
  title?: string | null;
}

/** Append a new version and make it current. Returns updated meta, or null if the plan is unknown. */
export function addVersion(id: string, input: AddVersionInput): PlanMeta | null {
  const tx = db.transaction((): number | null => {
    if (!planExistsStmt.get(id)) return null;
    const row = maxVersionStmt.get(id) as { m: number | null };
    const next = (row.m ?? 0) + 1;
    insertVersionStmt.run(id, next, input.html, input.title ?? null, input.note ?? null);
    bumpPlanStmt.run(next, input.title ?? null, id);
    return next;
  });

  if (tx() === null) return null;
  return getPlanMeta(id);
}

export function getPlanMeta(id: string): PlanMeta | null {
  return (metaByIdStmt.get(id) as PlanMeta | undefined) ?? null;
}

export function getVersions(id: string): VersionMeta[] {
  return versionsStmt.all(id) as VersionMeta[];
}

export function getContent(id: string, version?: number): PlanContent | null {
  const row =
    version === undefined ? currentContentStmt.get(id) : versionContentStmt.get(id, version);
  return (row as PlanContent | undefined) ?? null;
}

export interface ListOptions {
  project?: string | null;
  q?: string | null;
  limit?: number;
  offset?: number;
}

export interface ListResult {
  plans: PlanMeta[];
  total: number;
}

export function listPlans(opts: ListOptions = {}): ListResult {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.project) {
    where.push('p.project = ?');
    params.push(opts.project);
  }
  if (opts.q) {
    where.push('p.title LIKE ?');
    params.push(`%${opts.q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);

  const plans = db
    .prepare(
      `SELECT ${META_COLUMNS} FROM plans p ${whereSql} ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as PlanMeta[];

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM plans p ${whereSql}`).get(...params) as { c: number }
  ).c;

  return { plans, total };
}

export function listProjects(): string[] {
  return (
    db
      .prepare(
        `SELECT DISTINCT project FROM plans
          WHERE project IS NOT NULL AND project <> '' ORDER BY project`,
      )
      .all() as { project: string }[]
  ).map((r) => r.project);
}
