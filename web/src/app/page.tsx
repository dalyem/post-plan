import Link from 'next/link';
import { listPlans, listProjects, type PlanMeta } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

const fmtDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fmtDate.format(d);
}

export default async function Dashboard({ searchParams }: Props) {
  const sp = await searchParams;
  const project = one(sp.project);
  const q = one(sp.q);

  const { plans, total } = listPlans({ project, q });
  const projects = listProjects();

  const chip = (label: string, value: string | null) => {
    const params = new URLSearchParams();
    if (value) params.set('project', value);
    if (q) params.set('q', q);
    const href = params.toString() ? `/?${params.toString()}` : '/';
    const active = (value ?? null) === (project ?? null);
    return (
      <Link key={label} href={href} className={`chip${active ? ' active' : ''}`}>
        {label}
      </Link>
    );
  };

  return (
    <main className="wrap">
      <header className="app-header">
        <h1>post-plan</h1>
        <span className="sub">
          {total} plan{total === 1 ? '' : 's'}
        </span>
      </header>

      <div className="filters">
        {chip('All', null)}
        {projects.map((p) => chip(p, p))}
        <form className="search" action="/" method="get">
          {project ? <input type="hidden" name="project" value={project} /> : null}
          <input
            type="search"
            name="q"
            placeholder="Search titles…"
            defaultValue={q ?? ''}
            aria-label="Search plans by title"
          />
        </form>
      </div>

      {plans.length === 0 ? (
        <div className="empty">
          No plans yet.
          <br />
          Publish one with the post-plan MCP <code className="inline">publish_plan</code> tool,
          <br />
          or <code className="inline">POST</code> HTML to <code className="inline">/api/plans</code>.
        </div>
      ) : (
        <ul className="plan-list">
          {plans.map((p: PlanMeta) => (
            <li key={p.id} className="plan-row">
              <div className="plan-main">
                <div className="plan-title">
                  <Link href={`/p/${p.id}`}>{p.title}</Link>
                </div>
                <div className="plan-meta">
                  {p.project ? <span className="badge">{p.project}</span> : null}{' '}
                  {p.versionCount} version{p.versionCount === 1 ? '' : 's'} · {p.id}
                </div>
              </div>
              <div className="plan-right">updated {formatWhen(p.updatedAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
