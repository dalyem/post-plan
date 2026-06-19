import { createPlan, listPlans } from '@/lib/plans';
import { getBaseUrl, planUrl } from '@/lib/base-url';
import { intParam, jsonError, readJsonBody, MAX_HTML_BYTES } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const { plans, total } = listPlans({
    project: params.get('project'),
    q: params.get('q'),
    limit: intParam(params.get('limit')),
    offset: intParam(params.get('offset')),
  });
  const base = await getBaseUrl();
  return Response.json({
    plans: plans.map((p) => ({ ...p, url: planUrl(base, p.id) })),
    total,
  });
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object') return jsonError('Request body must be JSON');

  const { title, html, project, note } = body as Record<string, unknown>;
  if (typeof title !== 'string' || !title.trim()) return jsonError('`title` is required');
  if (typeof html !== 'string' || !html.trim()) return jsonError('`html` is required');
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return jsonError('`html` exceeds the size limit', 413);
  }
  if (project != null && typeof project !== 'string') return jsonError('`project` must be a string');
  if (note != null && typeof note !== 'string') return jsonError('`note` must be a string');

  const meta = createPlan({
    title: title.trim(),
    html,
    project: typeof project === 'string' && project.trim() ? project.trim() : null,
    note: typeof note === 'string' ? note : null,
  });

  const base = await getBaseUrl();
  return Response.json(
    { ...meta, version: meta.currentVersion, url: planUrl(base, meta.id) },
    { status: 201 },
  );
}
